/**
 * Deriv API calls used by the hourly printer.
 *
 * Accounts and purchases go over the options REST API (same host and header
 * style as the markup proxy in adminController). Tick history has no REST
 * equivalent, so it uses a short-lived connection to the public market-data
 * socket — opened once per evaluation and closed immediately, so there is no
 * long-running connection to keep alive or reconnect.
 */

const DERIV_REST = 'https://api.derivws.com';
const DERIV_PUBLIC_WS = 'wss://api.derivws.com/trading/v1/options/ws/public';

/**
 * The five 1-second volatility indices.
 *
 * Rounds are 1-tick contracts, so the tick interval *is* the round length: a 1s
 * index settles in about a second where the standard R_ indices take two. That
 * roughly doubles the rounds an hour can fit, which matters because a Differs
 * win is small — the hour needs volume to reach its target, and a recovery
 * ladder needs room to run before the hour is gone.
 *
 * The standard R_10/R_25/R_50/R_75/R_100 set was dropped for that reason alone.
 * Digit distribution is uniform on both, so this changes speed, not odds.
 */
const SYMBOLS = ['1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V'];

/** Deriv-App-ID header value. Reuses the markup app id already in the server env. */
const getAppId = () => process.env.MARKUP_APP_ID || process.env.CLIENT_ID || '';

const derivHeaders = (appId, token) => {
    const headers = { 'Deriv-App-ID': String(appId), 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
};

/**
 * Resolve a PAT to its options accounts, demo and real alike, so the admin can
 * choose which to run on. Doubles as token validation — an invalid or
 * wrongly-scoped token fails here rather than at trade time.
 */
const fetchAccounts = async (token, appId) => {
    const r = await fetch(`${DERIV_REST}/trading/v1/options/accounts`, {
        headers: derivHeaders(appId, token),
    });
    const json = await r.json().catch(() => null);
    if (!r.ok || !json) {
        const msg = json?.errors?.[0]?.message || `Deriv returned ${r.status}`;
        const err = new Error(msg);
        err.status = r.status === 401 || r.status === 403 ? 401 : 502;
        throw err;
    }
    const accounts = Array.isArray(json.data) ? json.data : [];
    return accounts.map(a => ({
        account_id: a.account_id,
        // Anything Deriv does not explicitly mark demo is treated as real, so an
        // unexpected value can never route a live account down the demo path.
        account_type: a.account_type === 'demo' ? 'demo' : 'real',
        currency: a.currency || 'USD',
        balance: Number(a.balance) || 0,
    }));
};

/** Current balance for one account, used to derive round profit from the delta. */
const fetchBalance = async (token, appId, accountId) => {
    const accounts = await fetchAccounts(token, appId);
    const row = accounts.find(a => a.account_id === accountId);
    return row ? row.balance : null;
};

/**
 * Buy one contract on one account.
 * Uses the bulk-purchase endpoint with a single account — the only options
 * purchase path that works from a server with a stored PAT. Demo and real are
 * separate endpoints, so the account type decides which one is called.
 */
const purchaseContract = async ({ token, appId, accountId, accountType, currency, contractParameters }) => {
    const body = {
        contract_parameters: { ...contractParameters, currency },
        accounts: [{ token, account_id: accountId }],
    };
    const path = accountType === 'demo' ? 'demo' : 'real';
    const r = await fetch(`${DERIV_REST}/trading/v1/options/contracts/bulk-purchase/${path}`, {
        method: 'POST',
        headers: derivHeaders(appId),
        body: JSON.stringify(body),
    });
    const json = await r.json().catch(() => null);

    const txn = json?.data?.transactions?.[0];
    if (!r.ok || !txn) {
        return { error: json?.errors?.[0]?.message || `Deriv returned ${r.status}` };
    }
    if (txn.error) return { error: txn.error.message || 'Purchase rejected' };

    return {
        contract_id: String(txn.contract_id || ''),
        buy_price: Number(txn.buy_price) || 0,
        transaction_id: String(txn.transaction_id || ''),
    };
};

/**
 * Pull the latest `count` ticks for each symbol over one short-lived socket.
 * Resolves with { symbol: number[] } for whatever arrived before the timeout,
 * so one slow market can never hold up the hourly evaluation.
 */
const fetchTickHistory = (symbols = SYMBOLS, count = 500, timeoutMs = 15000) =>
    new Promise(resolve => {
        if (typeof WebSocket === 'undefined') {
            console.error('[Printer] Global WebSocket unavailable — Node 22+ is required for tick history');
            return resolve({});
        }

        const out = {};
        let socket;
        let done = false;

        const finish = () => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            try {
                socket?.close();
            } catch {
                /* already closing */
            }
            resolve(out);
        };

        const timer = setTimeout(finish, timeoutMs);

        try {
            socket = new WebSocket(DERIV_PUBLIC_WS);
        } catch (err) {
            console.error('[Printer] Tick socket failed to open:', err.message);
            return finish();
        }

        socket.addEventListener('open', () => {
            symbols.forEach(symbol => {
                socket.send(JSON.stringify({ ticks_history: symbol, count, end: 'latest', style: 'ticks' }));
            });
        });

        socket.addEventListener('message', event => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.error) {
                    console.error('[Printer] Tick history error:', msg.error.code, msg.error.message);
                    return;
                }
                if (msg.history?.prices && msg.echo_req?.ticks_history) {
                    out[msg.echo_req.ticks_history] = msg.history.prices.map(Number);
                    if (Object.keys(out).length === symbols.length) finish();
                }
            } catch (err) {
                console.error('[Printer] Tick history parse error:', err.message);
            }
        });

        socket.addEventListener('error', () => finish());
        socket.addEventListener('close', () => finish());
    });

/**
 * Price a batch of candidate contracts over one short-lived public socket.
 *
 * The hedge strategy has to know what each leg pays before it can choose
 * barriers, and the payout is the whole point of the trade — so this asks Deriv
 * rather than estimating. The public endpoint prices without a token, which
 * keeps the account's credentials out of a call that only reads.
 *
 * `candidates` is [{ key, contract_type, symbol, half, minutes }]; the reply is
 * { key: payout } for whatever priced before the timeout.
 */
const priceContracts = (candidates, stake, timeoutMs = 12000) =>
    new Promise(resolve => {
        if (typeof WebSocket === 'undefined' || !candidates.length) return resolve({});

        const out = {};
        let socket;
        let done = false;
        const byReq = new Map();

        const finish = () => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            try {
                socket?.close();
            } catch {
                /* already closing */
            }
            resolve(out);
        };
        const timer = setTimeout(finish, timeoutMs);

        try {
            socket = new WebSocket(DERIV_PUBLIC_WS);
        } catch (err) {
            console.error('[Printer] Proposal socket failed to open:', err.message);
            return finish();
        }

        socket.addEventListener('open', () => {
            candidates.forEach((c, i) => {
                byReq.set(i + 1, c.key);
                socket.send(
                    JSON.stringify({
                        proposal: 1,
                        req_id: i + 1,
                        amount: Number(stake.toFixed(2)),
                        basis: 'stake',
                        contract_type: c.contract_type,
                        currency: 'USD',
                        duration: c.minutes,
                        duration_unit: 'm',
                        underlying_symbol: c.symbol,
                        // Barriers relative to the spot at purchase, so the quote
                        // matches the contract that will actually be bought.
                        barrier: `+${c.half.toFixed(3)}`,
                        barrier2: `-${c.half.toFixed(3)}`,
                    })
                );
            });
        });

        socket.addEventListener('message', event => {
            try {
                const msg = JSON.parse(event.data);
                const key = byReq.get(msg.req_id);
                if (key === undefined) return;
                // An unpriceable barrier is simply not a candidate; the caller
                // picks from whatever came back.
                if (!msg.error && msg.proposal) out[key] = Number(msg.proposal.payout);
                byReq.delete(msg.req_id);
                if (!byReq.size) finish();
            } catch (err) {
                console.error('[Printer] Proposal parse error:', err.message);
            }
        });

        socket.addEventListener('error', () => finish());
        socket.addEventListener('close', () => finish());
    });

/**
 * Buy several contracts over ONE socket, written back-to-back.
 *
 * The REST path opens a separate HTTPS request per contract, so two legs of a
 * hedge carry their own connection setup and land whenever they land — tens to
 * hundreds of milliseconds apart. Each contract then starts, and expires, at its
 * own moment, which is what let a one-window hedge lose both legs.
 *
 * This authorises once and writes every buy to the open socket in a single
 * pass, so the messages leave in order with nothing between them. It is the
 * same shape the QuantumSyn speed bot uses to fire a bulk batch.
 *
 * Returns one result per leg in the order given, or null if the socket could
 * not be used at all — the caller falls back to REST rather than skipping a
 * round, since this path cannot be exercised without a live account.
 */
const purchaseOverSocket = ({ token, accountId, currency, legs, timeoutMs = 20000 }) =>
    new Promise(resolve => {
        if (typeof WebSocket === 'undefined' || !legs.length) return resolve(null);

        let socket;
        let done = false;
        const results = new Array(legs.length).fill(null);
        const pending = new Map();

        const finish = value => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            try {
                socket?.close();
            } catch {
                /* already closing */
            }
            resolve(value);
        };
        const timer = setTimeout(() => finish(null), timeoutMs);

        try {
            socket = new WebSocket(DERIV_PUBLIC_WS);
        } catch (err) {
            console.error('[Printer] Buy socket failed to open:', err.message);
            return resolve(null);
        }

        socket.addEventListener('open', () => {
            socket.send(JSON.stringify({ authorize: token, req_id: 1 }));
        });

        socket.addEventListener('message', event => {
            let msg;
            try {
                msg = JSON.parse(event.data);
            } catch {
                return;
            }

            if (msg.req_id === 1) {
                // Authorisation is the gate: without it nothing can be bought,
                // and falling back to REST is better than failing the round.
                if (msg.error) {
                    console.error('[Printer] Buy socket authorize failed:', msg.error.message);
                    return finish(null);
                }
                /* Every leg written in one pass. No await between them, so they
                   leave in order with nothing in between — the whole point. */
                legs.forEach((leg, i) => {
                    const reqId = i + 2;
                    pending.set(reqId, i);
                    socket.send(
                        JSON.stringify({
                            buy: 1,
                            price: leg.params.amount,
                            parameters: { ...leg.params, currency },
                            ...(accountId ? { account_id: accountId } : {}),
                            req_id: reqId,
                        })
                    );
                });
                return;
            }

            const index = pending.get(msg.req_id);
            if (index === undefined) return;
            pending.delete(msg.req_id);

            results[index] = msg.error
                ? { error: msg.error.message || 'Purchase rejected' }
                : {
                      contract_id: String(msg.buy?.contract_id || ''),
                      buy_price: Number(msg.buy?.buy_price) || 0,
                      transaction_id: String(msg.buy?.transaction_id || ''),
                  };

            if (!pending.size) finish(results);
        });

        socket.addEventListener('error', () => finish(null));
        socket.addEventListener('close', () => finish(done ? undefined : null));
    });

module.exports = {
    purchaseOverSocket,
    priceContracts,
    SYMBOLS,
    getAppId,
    fetchAccounts,
    fetchBalance,
    purchaseContract,
    fetchTickHistory,
};
