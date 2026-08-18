/**
 * Admin printer — the Over 2 / Under 7 bot that runs on the server.
 *
 * Nothing here drives the trading. Once /start succeeds the server works each
 * hour toward its profit target on its own; these calls only configure it and
 * read its state, so closing the tab has no effect on a running session.
 */

// Empty by default → same-origin (/api/...), proxied to the backend by Vite.
const API_URL = (process.env.API_URL || '').replace(/\/$/, '');

export interface PrinterAccount {
    account_id: string;
    account_type: 'real' | 'demo';
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
    /** 'pair' = Over 2 + Under 7, 'recovery' = a single Even sized to the deficit. */
    mode: 'pair' | 'recovery';
    status: 'open' | 'settled' | 'failed';
    profit: number | null;
    reason: string;
    placedAt: string;
    legs: PrinterLeg[];
}

export interface PrinterSession {
    active: boolean;
    /** A PAT is on file, so starting again does not require re-entering it. */
    hasToken: boolean;
    account_id: string;
    account_type: 'real' | 'demo';
    currency: string;
    stake: number;
    stopLoss: number;
    takeProfit: number;
    stoppedReason: string;
    startedAt: string | null;
    stats: { trades: number; wins: number; losses: number; profit: number };
    /** Outstanding loss the next round tries to win back. Above 0 = in recovery. */
    deficit: number;
    /** Martingale applied to the Even recovery ladder. */
    recoveryMultiplier: number;
    lastRecoveryStake: number;
    /** The session trades rounds until hourlyProfit reaches this, then idles. */
    hourlyTarget: number;
    hourlyProfit: number;
    hourRounds: number;
    hourDone: boolean;
    hourEndedReason: string;
    tradedThisHour: boolean;
    nextHourAt: string | null;
    trades: PrinterTrade[];
}

export interface StartParams {
    /** Omit to reuse the token already stored server-side. */
    token?: string;
    account_id: string;
    stake: number;
    stopLoss?: number;
    takeProfit?: number;
    /** Profit the session works toward each hour before idling. Defaults to 2. */
    hourlyTarget?: number;
    /** Martingale on the Even recovery ladder. Defaults to 2. */
    recoveryMultiplier?: number;
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

/**
 * Resolve a PAT to its accounts (demo and real). The token is not stored by this
 * call; omit it to use the one already on file.
 */
export const resolvePrinterAccounts = (loginids: string[], token?: string): Promise<PrinterAccount[]> =>
    post('accounts', loginids, token ? { token } : {}).then(d => d.accounts as PrinterAccount[]);

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
