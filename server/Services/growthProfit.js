/**
 * Reads a user's realised profit on this site, server-side.
 *
 * The growth reward pays out real premium, so the figure it pays on cannot be
 * the client's word for it — a posted number would hand anyone free premium
 * for as long as they cared to keep posting. The server does its own read,
 * the same way the frontend does: swap the access token for a short-lived OTP
 * socket URL, then walk the account's statement over it.
 *
 * `statement`, not `profit_table`: the challenge only counts trades placed
 * here, and `app_id` ("ID of the application where this contract was
 * purchased") exists on a statement transaction and not on a profit-table one.
 * The statement is the only place Deriv says which app bought a contract.
 *
 * The token is used for this read and nothing else. It is never stored and
 * never logged.
 */

const DERIV_REST = 'https://api.derivws.com';

/** Deriv-App-ID header value. Reuses the markup app id already in the server env. */
const getAppId = () => process.env.MARKUP_APP_ID || process.env.CLIENT_ID || '';

/**
 * The app id a contract must have been bought under to count.
 *
 * Trades are placed over a socket opened with the OAuth2 token, so they belong
 * to the app that issued it — the frontend's CLIENT_ID, which is the same value
 * as MARKUP_APP_ID here. (Not the legacy APP_ID, which this flow no longer
 * uses.) DERIV_TRADING_APP_ID overrides it should they ever diverge.
 */
const getTradingAppId = () => process.env.DERIV_TRADING_APP_ID || getAppId();

const PAGE_SIZE = 500;
/** Bounds a pathological history rather than walking it forever. */
const MAX_PAGES = 20;
/** The whole walk, not one page — a stalled socket must not pin a request open. */
const OVERALL_TIMEOUT_MS = 20_000;

const round2 = n => Math.round(n * 100) / 100;

/**
 * Realised profit on contracts bought through this app, from statement rows.
 *
 * A contract appears twice: a `buy` for the stake and, once it settles, a
 * `sell` for the proceeds. Only the buy carries the app id, so that is what
 * decides whether a contract belongs to us; the sell is then matched to it by
 * contract id.
 *
 * A contract with a buy but no sell is still open. It is skipped rather than
 * counted as a total loss, which is what makes this *realised* profit and
 * keeps it from lurching negative every time a position is held.
 *
 * Amounts are taken as magnitudes: a buy debits the account and a sell credits
 * it, and reading the sign rather than the size would make the arithmetic
 * depend on a convention this code does not control.
 *
 * With no app id configured nothing matches, which stalls the challenge at
 * zero rather than paying out on trades placed somewhere else.
 */
const summariseStatement = (rows, appId) => {
    const wanted = String(appId || '');

    const stakes = new Map();
    const proceeds = new Map();
    // Every app id seen on a buy row, so a zero can be told apart from a
    // mismatch without another round of guessing.
    const appIds = new Set();
    let buyRows = 0;
    let sellRows = 0;

    for (const row of rows || []) {
        const id = row && row.contract_id;
        if (!id) continue;
        const amount = Math.abs(Number(row.amount) || 0);

        if (row.action_type === 'buy') {
            buyRows += 1;
            appIds.add(String(row.app_id));
            // Bought somewhere else — DTrader, another of our sites, any
            // third-party app on the same Deriv login. Not our challenge.
            if (!wanted || String(row.app_id) !== wanted) continue;
            stakes.set(id, amount);
        } else if (row.action_type === 'sell') {
            sellRows += 1;
            proceeds.set(id, amount);
        }
    }

    let total = 0;
    let matched = 0;
    for (const [id, stake] of stakes) {
        if (!proceeds.has(id)) continue;
        matched += 1;
        total += proceeds.get(id) - stake;
    }

    return {
        profit: round2(total),
        rowsSeen: (rows || []).length,
        buyRows,
        sellRows,
        ourBuys: stakes.size,
        matched,
        appIdsSeen: [...appIds],
        lookingFor: wanted,
    };
};

/** Realised profit alone, for callers that do not need the breakdown. */
const realisedProfit = (rows, appId) => summariseStatement(rows, appId).profit;

/**
 * Swaps an OAuth access token for an authenticated WebSocket URL.
 *
 * A rejected token is reported as 401 so the caller can answer cleanly rather
 * than as a server fault; anything else is an upstream failure.
 */
const fetchOtpSocketUrl = async (accessToken, loginid) => {
    const appId = getAppId();
    const r = await fetch(`${DERIV_REST}/trading/v1/options/accounts/${encodeURIComponent(loginid)}/otp`, {
        method: 'POST',
        headers: {
            'Deriv-App-ID': String(appId),
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
    });

    const json = await r.json().catch(() => null);
    if (!r.ok || !json || !json.data || !json.data.url) {
        const msg = (json && json.errors && json.errors[0] && json.errors[0].message) || `Deriv returned ${r.status}`;
        console.error('[Growth] Could not get an OTP socket from Deriv:', {
            status: r.status,
            loginid,
            appId: String(appId),
            errors: json && json.errors,
        });
        const err = new Error(msg);
        err.status = r.status === 401 || r.status === 403 ? 401 : 502;
        throw err;
    }
    return json.data.url;
};

/**
 * What the account has made here since it joined the challenge.
 *
 * Windowed at the source with `date_from`, so neither the account's past nor
 * its trading elsewhere counts. Rows are read unfiltered by `action_type`
 * because both halves of a contract are needed — the buy to attribute it and
 * the sell to settle it.
 *
 * Resolves the whole summary, not just the figure: a zero is ambiguous on its
 * own, and the breakdown says whether it means no trades, no settled trades,
 * or trades under an app id we are not looking for.
 */
const fetchChallengeProfit = (accessToken, loginid, sinceEpoch) =>
    new Promise((resolve, reject) => {
        if (typeof WebSocket === 'undefined') {
            const err = new Error('Global WebSocket unavailable — Node 22+ is required to read profit');
            err.status = 500;
            return reject(err);
        }

        fetchOtpSocketUrl(accessToken, loginid).then(url => {
            let socket;
            let settled = false;
            let offset = 0;
            const rows = [];

            const finish = (err, value) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                try {
                    if (socket) socket.close();
                } catch (_) {
                    /* already closing */
                }
                if (err) reject(err);
                else resolve(value);
            };

            const timer = setTimeout(() => {
                console.error('[Growth] Timed out reading the statement for', loginid);
                const err = new Error('Timed out reading the statement');
                err.status = 504;
                finish(err);
            }, OVERALL_TIMEOUT_MS);

            /* Set once the windowed walk has come back empty. The same socket
               then asks again with no date_from, purely to find out why: an
               account with no history at all is a different fault from one
               whose trades fall outside the window, and the rows also reveal
               the app_id Deriv really stamps on a buy. */
            let probing = false;

            const requestPage = () => {
                const req = { statement: 1, description: 1, limit: PAGE_SIZE, offset };
                if (sinceEpoch && !probing) req.date_from = sinceEpoch;
                socket.send(JSON.stringify(req));
            };

            try {
                socket = new WebSocket(url);
            } catch (e) {
                const err = new Error('Could not open the Deriv socket');
                err.status = 502;
                return finish(err);
            }

            socket.addEventListener('open', requestPage);

            socket.addEventListener('message', event => {
                if (settled) return;
                let msg;
                try {
                    msg = JSON.parse(event.data);
                } catch (e) {
                    return; // not ours to parse
                }

                if (msg.error) {
                    console.error('[Growth] Deriv rejected the statement request:', {
                        code: msg.error.code,
                        message: msg.error.message,
                        loginid,
                        date_from: sinceEpoch,
                    });
                    const err = new Error(msg.error.message || 'Deriv rejected the statement request');
                    err.derivCode = msg.error.code || null;
                    // An expired or wrongly-scoped token reads as an auth failure.
                    err.status = /Authoriz|Token|Invalid/i.test(msg.error.code || '') ? 401 : 502;
                    return finish(err);
                }

                if (!msg.statement) return;

                const page = msg.statement.transactions || [];

                if (probing) {
                    const appIds = new Set();
                    let newest = null;
                    for (const r of page) {
                        if (r && r.action_type === 'buy') appIds.add(String(r.app_id));
                        const t = Number(r && r.transaction_time) || 0;
                        if (t && (!newest || t > newest)) newest = t;
                    }
                    const summary = summariseStatement(rows, getTradingAppId());
                    summary.dateFrom = sinceEpoch || null;
                    summary.probe = {
                        ran: true,
                        rowsWithoutWindow: page.length,
                        appIdsSeen: [...appIds],
                        newestTxTime: newest,
                        newestTxISO: newest ? new Date(newest * 1000).toISOString() : null,
                    };
                    return finish(null, summary);
                }

                rows.push(...page);
                offset += page.length;

                const pagesRead = Math.ceil(offset / PAGE_SIZE);
                if (page.length < PAGE_SIZE || pagesRead >= MAX_PAGES) {
                    if (rows.length === 0 && sinceEpoch) {
                        probing = true;
                        offset = 0;
                        return requestPage();
                    }
                    const summary = summariseStatement(rows, getTradingAppId());
                    summary.dateFrom = sinceEpoch || null;
                    return finish(null, summary);
                }
                requestPage();
            });

            socket.addEventListener('error', () => {
                const err = new Error('The Deriv socket failed');
                err.status = 502;
                finish(err);
            });

            // A close before the walk finished is a failure; afterwards,
            // `settled` already short-circuits this.
            socket.addEventListener('close', () => {
                const err = new Error('The Deriv socket closed before the statement was read');
                err.status = 502;
                finish(err);
            });
        }, reject);
    });

module.exports = { realisedProfit, summariseStatement, fetchOtpSocketUrl, fetchChallengeProfit };
