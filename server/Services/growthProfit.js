/**
 * Reads a user's realised profit from Deriv, server-side.
 *
 * The growth reward pays out real premium, so the figure it pays on cannot be
 * the client's word for it — a posted number would hand anyone free premium
 * for as long as they cared to keep posting. The server does its own read,
 * the same way the frontend does: swap the access token for a short-lived OTP
 * socket URL, then walk `profit_table` over it.
 *
 * The token is used for this read and nothing else. It is never stored and
 * never logged.
 */

const DERIV_REST = 'https://api.derivws.com';

/** Deriv-App-ID header value. Reuses the markup app id already in the server env. */
const getAppId = () => process.env.MARKUP_APP_ID || process.env.CLIENT_ID || '';

/**
 * The app id trades must carry to count toward the challenge.
 *
 * This has to be the id this site's frontend places trades under, which is not
 * necessarily the markup id — set DERIV_TRADING_APP_ID when they differ.
 */
const getTradingAppId = () => process.env.DERIV_TRADING_APP_ID || getAppId();

const PAGE_SIZE = 500;
/** Bounds a pathological history rather than walking it forever. */
const MAX_PAGES = 20;
/** The whole walk, not one page — a stalled socket must not pin a request open. */
const OVERALL_TIMEOUT_MS = 20_000;

const round2 = n => Math.round(n * 100) / 100;

/**
 * What a set of profit-table rows earned.
 *
 * `profit_table` carries no profit field, only the two prices, so this is the
 * one place the subtraction happens. Rounded to cents because a threshold
 * comparison on a float that drifted is a reward granted or withheld wrongly.
 */
/**
 * Keeps only the contracts bought through this site.
 *
 * `profit_table` returns the account's trades whoever placed them — DTrader,
 * another of our sites, any third-party app on the same Deriv login. The
 * challenge is about trading here, so everything else is dropped.
 *
 * With no app id configured nothing matches, which stalls the challenge at
 * zero rather than paying out on trades placed somewhere else.
 */
const filterToApp = (rows, appId) => {
    const wanted = String(appId || '');
    if (!wanted) return [];
    return (rows || []).filter(row => String(row && row.app_id) === wanted);
};

const sumProfit = rows =>
    round2(
        (rows || []).reduce((total, row) => {
            const sell = Number(row && row.sell_price) || 0;
            const buy = Number(row && row.buy_price) || 0;
            return total + (sell - buy);
        }, 0)
    );

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
        const err = new Error(msg);
        err.status = r.status === 401 || r.status === 403 ? 401 : 502;
        throw err;
    }
    return json.data.url;
};

/**
 * What the account has made here since it joined the challenge.
 *
 * Windowed at the source with `date_from` and filtered to this app's trades,
 * so neither the account's past nor its trading elsewhere counts.
 *
 * Walks ascending so a trade settling mid-walk cannot shift a later row into a
 * page already read.
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
            let total = 0;

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
                const err = new Error('Timed out reading the profit table');
                err.status = 504;
                finish(err);
            }, OVERALL_TIMEOUT_MS);

            const requestPage = () => {
                const req = { profit_table: 1, description: 1, sort: 'ASC', limit: PAGE_SIZE, offset };
                if (sinceEpoch) req.date_from = sinceEpoch;
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
                    const err = new Error(msg.error.message || 'Deriv rejected the profit table request');
                    // An expired or wrongly-scoped token reads as an auth failure.
                    err.status = /Authoriz|Token|Invalid/i.test(msg.error.code || '') ? 401 : 502;
                    return finish(err);
                }

                if (!msg.profit_table) return;

                const rows = msg.profit_table.transactions || [];
                /* Paging counts every row Deriv sent, not just the ones kept —
                   the offset addresses its table, not our filtered view. */
                total += sumProfit(filterToApp(rows, getTradingAppId()));
                offset += rows.length;

                const pagesRead = Math.ceil(offset / PAGE_SIZE);
                if (rows.length < PAGE_SIZE || pagesRead >= MAX_PAGES) return finish(null, round2(total));
                requestPage();
            });

            socket.addEventListener('error', () => {
                const err = new Error('The Deriv socket failed');
                err.status = 502;
                finish(err);
            });

            // A close before any page arrived is a failure; after the walk
            // finished, `settled` already short-circuits this.
            socket.addEventListener('close', () => {
                const err = new Error('The Deriv socket closed before the profit table was read');
                err.status = 502;
                finish(err);
            });
        }, reject);
    });

module.exports = { sumProfit, filterToApp, fetchOtpSocketUrl, fetchChallengeProfit };
