/**
 * The vault's admin data, read and written from here.
 *
 * Markup across every site, the access tokens and the site credentials all
 * live in quantum-vault's database, and this app has no copy of any of them.
 * It reaches them the same way it already reaches the shared admin balance in
 * `qv-balance.ts`: a plain call to the vault, naming the allow-listed Deriv
 * loginid of whoever is signed in.
 *
 * That loginid is the credential. The vault resolves it against its admin
 * allow-list — the same check that turns admin mode on in this app — so
 * nobody signs in twice. It holds only because writing that allow-list is
 * behind a shared secret on the vault; if that stops being true, this stops
 * being safe.
 */
const QV = 'https://api.quantumsyn.pro/api';

/** Appended to every call: the vault resolves it against its allow-list. */
const withId = (url: string, loginid: string): string => {
    if (!loginid) return url;
    return `${url}${url.includes('?') ? '&' : '?'}loginids=${encodeURIComponent(loginid.toUpperCase())}`;
};

/** Time-boxed, so a slow vault cannot hang an admin page. */
const ask = async <T>(path: string, loginid: string, init?: RequestInit, timeoutMs = 15000): Promise<T> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(withId(`${QV}${path}`, loginid), {
            ...init,
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.message || `The vault answered ${res.status}.`);
        return body as T;
    } finally {
        clearTimeout(timer);
    }
};

// ── Markup ───────────────────────────────────────────────────────────────────

export interface MarkupSite {
    site: string;
    app_id: string | null;
    app_markup_usd: number;
    volume_usd: number;
    payout_usd: number;
    contract_count: number;
    client_count: number;
    configured: boolean;
    error: string | null;
}

export interface MarkupTotal {
    app_markup_usd: number;
    volume_usd: number;
    payout_usd: number;
    contract_count: number;
    client_count: number;
}

export interface MarkupAll {
    date_from: string;
    date_to: string;
    sites: MarkupSite[];
    total: MarkupTotal;
}

export const fetchMarkupAll = (loginid: string, from: string, to: string): Promise<MarkupAll> =>
    ask<MarkupAll>(`/markup-statistics/v4/all?date_from=${from}&date_to=${to}`, loginid);

// ── Access tokens ────────────────────────────────────────────────────────────

export type TokenDuration = '1day' | '1week' | '1month' | 'lifetime';
export const TOKEN_DURATIONS: { id: TokenDuration; label: string }[] = [
    { id: '1day', label: '1 day' },
    { id: '1week', label: '1 week' },
    { id: '1month', label: '1 month' },
    { id: 'lifetime', label: 'Lifetime' },
];

export interface AccessToken {
    _id: string;
    token: string;
    clientName: string;
    duration: TokenDuration;
    description?: string;
    /** The vault works this out: active, used, expired or deactivated. */
    status: 'active' | 'used' | 'expired' | 'deactivated';
    isActive: boolean;
    isUsed: boolean;
    usedAt: string | null;
    expiresAt: string | null;
    validationCount?: number;
    lastValidatedAt?: string | null;
    createdAt: string;
}

export const fetchTokens = (loginid: string): Promise<{ data: AccessToken[]; total: number }> =>
    ask(`/access-tokens?includeExpired=true`, loginid);

export const createToken = (
    loginid: string,
    body: { clientName: string; duration: TokenDuration; description?: string }
): Promise<{ data: AccessToken }> =>
    ask(`/access-tokens/create`, loginid, { method: 'POST', body: JSON.stringify(body) });

export const deactivateToken = (loginid: string, id: string): Promise<unknown> =>
    ask(`/access-tokens/${encodeURIComponent(id)}/deactivate`, loginid, { method: 'PATCH' });

export const deleteToken = (loginid: string, id: string): Promise<unknown> =>
    ask(`/access-tokens/${encodeURIComponent(id)}`, loginid, { method: 'DELETE' });

// ── Site credentials ─────────────────────────────────────────────────────────

/** How the vault describes one editable field. */
export interface CredentialField {
    key: string;
    label: string;
    /** Never sent back in full — `value` is a masked hint, not the secret. */
    secret: boolean;
    clear: boolean;
}

export interface CredentialValue {
    set: boolean;
    value: string | null;
    secret: boolean;
}

export interface CredentialSite {
    site: string;
    exists: boolean;
    updatedAt?: string;
    [field: string]: CredentialValue | string | boolean | undefined;
}

export interface CredentialList {
    fields: CredentialField[];
    sites: CredentialSite[];
}

export const fetchCredentials = (loginid: string): Promise<CredentialList> =>
    ask<CredentialList>(`/site-credentials/all`, loginid);

/** Adds a site, or replaces the fields named on one that exists. */
export const addSite = (loginid: string, body: Record<string, string>): Promise<unknown> =>
    ask(`/site-credentials`, loginid, { method: 'POST', body: JSON.stringify(body) });

/** Only the fields that changed are sent; anything omitted keeps its value. */
export const saveCredentialFields = (
    loginid: string,
    site: string,
    fields: Record<string, string>
): Promise<unknown> =>
    ask(`/site-credentials/fields`, loginid, { method: 'PATCH', body: JSON.stringify({ site, ...fields }) });

export const deleteSite = (loginid: string, site: string): Promise<unknown> =>
    ask(`/site-credentials`, loginid, { method: 'DELETE', body: JSON.stringify({ site }) });
