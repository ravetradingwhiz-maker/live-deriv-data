/**
 * Admin printer — the hourly O5U4 bot that runs on the server.
 *
 * Nothing here drives the trading. Once /start succeeds the server places one
 * round per hour on its own; these calls only configure it and read its state,
 * so closing the tab has no effect on a running session.
 */

// Empty by default → same-origin (/api/...), proxied to the backend by Vite.
const API_URL = (process.env.API_URL || '').replace(/\/$/, '');

export interface PrinterAccount {
    account_id: string;
    currency: string;
    balance: number;
}

export interface PrinterLeg {
    contract_type: string;
    barrier: string;
    contract_id: string;
    buy_price: number;
    error?: string;
}

export interface PrinterTrade {
    hourKey: string;
    symbol: string;
    stake: number;
    status: 'open' | 'settled' | 'failed';
    profit: number | null;
    reason: string;
    placedAt: string;
    legs: PrinterLeg[];
}

export interface PrinterSession {
    active: boolean;
    account_id: string;
    currency: string;
    stake: number;
    stopLoss: number;
    takeProfit: number;
    stoppedReason: string;
    startedAt: string | null;
    stats: { trades: number; wins: number; losses: number; profit: number };
    tradedThisHour: boolean;
    nextHourAt: string | null;
    trades: PrinterTrade[];
}

export interface StartParams {
    token: string;
    account_id: string;
    stake: number;
    stopLoss?: number;
    takeProfit?: number;
}

const json = async (res: Response) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || data?.message || `Request failed (${res.status})`);
    return data;
};

const post = (path: string, loginids: string[], body: Record<string, unknown> = {}) =>
    fetch(`${API_URL}/api/printer/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginids: loginids.join(','), ...body }),
    }).then(json);

/** Resolve a PAT to its real accounts. The token is not stored by this call. */
export const resolvePrinterAccounts = (loginids: string[], token: string): Promise<PrinterAccount[]> =>
    post('accounts', loginids, { token }).then(d => d.accounts as PrinterAccount[]);

export const startPrinter = (loginids: string[], params: StartParams): Promise<PrinterSession> =>
    post('start', loginids, { ...params }).then(d => d.session as PrinterSession);

export const stopPrinter = (loginids: string[]): Promise<PrinterSession> =>
    post('stop', loginids).then(d => d.session as PrinterSession);

export const removePrinterToken = (loginids: string[]): Promise<null> =>
    fetch(`${API_URL}/api/printer/token`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginids: loginids.join(',') }),
    })
        .then(json)
        .then(() => null);

export const getPrinterStatus = (loginids: string[]): Promise<PrinterSession | null> => {
    const list = loginids.filter(Boolean).join(',');
    if (!list) return Promise.resolve(null);
    return fetch(`${API_URL}/api/printer/status?loginids=${encodeURIComponent(list)}`)
        .then(json)
        .then(d => (d.session as PrinterSession) ?? null);
};
