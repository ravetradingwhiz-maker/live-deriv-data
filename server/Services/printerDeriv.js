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

// The 10 volatility indices the O5U4 strategy trades.
const SYMBOLS = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100', '1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V'];

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

module.exports = {
    SYMBOLS,
    getAppId,
    fetchAccounts,
    fetchBalance,
    purchaseContract,
    fetchTickHistory,
};
