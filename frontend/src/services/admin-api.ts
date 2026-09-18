/** Admin role check + management against the payments/subscription server. */

import type { AnyTier, Product, Tier } from '@/services/payments-api';

// Empty by default → same-origin (/api/...), proxied to the backend by Vite.
// Set API_URL only when the API lives on another host.
const API_URL = (process.env.API_URL || '').replace(/\/$/, '');

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
    /** Which product this tier belongs to — see config/tiers.js on the server. */
    product: Product;
    priceUSD: number;
    months: number;
    rank: number;
    /** Seats the pricing card says are left at this price. 0 hides the line. */
    slotsLeft: number;
}
// Every tier the server knows, not just the ones this app sells — the pricing
// screen is where QuantumSyn's price is set.
export type TierTable = Record<AnyTier, TierConfig>;

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
    body: Partial<Record<AnyTier, { priceUSD?: number; months?: number; slotsLeft?: number }>>
): Promise<{ tiers: TierTable }> =>
    fetch(`${API_URL}/api/admin/pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then(json);

// ── Payment methods ─────────────────────────────────────────────────────────
export type MethodId = 'card' | 'mpesa' | 'crypto';
export type MethodFlags = Record<MethodId, boolean>;
export type MethodDefs = Record<MethodId, { label: string; desc: string }>;

export const getAdminPaymentMethods = (): Promise<{
    methods: MethodFlags;
    defs: MethodDefs;
    defaults: MethodFlags;
}> => fetch(`${API_URL}/api/admin/payment-methods`).then(json);

export const setAdminPaymentMethods = (body: MethodFlags): Promise<{ methods: MethodFlags }> =>
    fetch(`${API_URL}/api/admin/payment-methods`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then(json);

// ── PayHero service wallet ──────────────────────────────────────────────────
// The float each M-Pesa push draws its fee from. It empties as you sell, and
// when it does M-Pesa fails while card and crypto keep working.

export interface PayHeroWallet {
    balance: number;
    currency: string;
    updatedAt: string | null;
}

export const getPayHeroWallet = (): Promise<PayHeroWallet> =>
    fetch(`${API_URL}/api/admin/payhero/wallet`).then(json);

/**
 * Queues a top-up. The number given gets an M-Pesa prompt, so the balance only
 * moves once that PIN is entered — this returns as soon as it is queued.
 */
export const topUpPayHero = (body: { amount: number; phone: string }): Promise<{ ok: boolean; status: string; reference: string }> =>
    fetch(`${API_URL}/api/admin/payhero/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then(json);
