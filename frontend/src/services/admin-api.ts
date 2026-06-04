/** Admin role check + management against the payments/subscription server. */

import type { Tier } from '@/services/payments-api';

const API_URL = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');

export interface AdminCheck {
    isAdmin: boolean;
    role: string | null;
}

/** Returns admin if ANY of the supplied loginids is allow-listed. */
export const checkAdmin = (loginids: string[]): Promise<AdminCheck> => {
    const list = loginids.filter(Boolean).join(',');
    if (!list) return Promise.resolve({ isAdmin: false, role: null });
    return fetch(`${API_URL}/api/admin/check?loginids=${encodeURIComponent(list)}`)
        .then(r => r.json())
        .catch(() => ({ isAdmin: false, role: null }));
};

const json = async (res: Response) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || data?.message || `Request failed (${res.status})`);
    return data;
};

// ── Subscriptions ────────────────────────────────────────────────────────────
export interface AdminSubscription {
    _id: string;
    loginids: string[];
    email?: string;
    tier: Tier;
    startedAt: string;
    expiresAt: string;
    status: 'active' | 'expired';
    paymentId?: string;
    createdAt?: string;
}

export const listSubscriptions = (params: { q?: string; status?: string } = {}): Promise<AdminSubscription[]> => {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.status) qs.set('status', params.status);
    return fetch(`${API_URL}/api/admin/subscriptions?${qs.toString()}`)
        .then(json)
        .then(d => d.subscriptions ?? []);
};

export const createSubscription = (body: {
    loginids: string[];
    tier: Tier;
    months?: number;
    email?: string;
}): Promise<AdminSubscription> =>
    fetch(`${API_URL}/api/admin/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
        .then(json)
        .then(d => d.subscription);

export const updateSubscription = (
    id: string,
    patch: { tier?: Tier; status?: 'active' | 'expired'; expiresAt?: string }
): Promise<AdminSubscription> =>
    fetch(`${API_URL}/api/admin/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
    })
        .then(json)
        .then(d => d.subscription);

export const deleteSubscription = (id: string): Promise<void> =>
    fetch(`${API_URL}/api/admin/subscriptions/${id}`, { method: 'DELETE' }).then(json).then(() => undefined);

// ── Payments ──────────────────────────────────────────────────────────────────
export interface AdminPayment {
    _id: string;
    orderId: string;
    tier: Tier;
    priceUSD: number;
    payCurrency: string;
    payAmount: number;
    email: string;
    loginids: string[];
    status: 'pending' | 'paid' | 'expired' | 'failed';
    paidAt?: string | null;
    createdAt?: string;
}

export const listPayments = (params: { q?: string; status?: string } = {}): Promise<AdminPayment[]> => {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.status) qs.set('status', params.status);
    return fetch(`${API_URL}/api/admin/payments?${qs.toString()}`)
        .then(json)
        .then(d => d.payments ?? []);
};

// ── Pricing ─────────────────────────────────────────────────────────────────
export interface TierConfig {
    label: string;
    priceUSD: number;
    months: number;
    rank: number;
}
export type TierTable = Record<Tier, TierConfig>;

export const getAdminPricing = (): Promise<{ tiers: TierTable; defaults: TierTable }> =>
    fetch(`${API_URL}/api/admin/pricing`).then(json);

// ── Markup (Deriv v4 via our server proxy) ────────────────────────────────────
export interface MarkupTotals {
    markup: number;
    volume: number;
    payout: number;
    contracts: number;
    clients: number;
    app_id?: string;
}

export const getMarkup = (dateFrom: string, dateTo: string): Promise<MarkupTotals> =>
    fetch(`${API_URL}/api/admin/markup?date_from=${dateFrom}&date_to=${dateTo}`).then(json);

export const setAdminPricing = (
    body: Partial<Record<Tier, { priceUSD?: number; months?: number }>>
): Promise<{ tiers: TierTable }> =>
    fetch(`${API_URL}/api/admin/pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then(json);
