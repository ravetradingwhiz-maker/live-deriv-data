/** Client for the Nexora payments/subscription server (live-deriv-data/server). */

// Empty by default → calls are same-origin (/api/...) and the Vite dev server
// proxies them to the backend. Set API_URL only when the API is on another host.
const API_URL = (process.env.API_URL || '').replace(/\/$/, '');

export type PayCurrency = 'usdt';
export type Tier = 'alpha' | 'quantum' | 'apex';

export interface CreatePaymentBody {
    tier: Tier;
    payCurrency: PayCurrency;
    email: string;
    loginids: string[];
}

export interface PaymentOrder {
    orderId: string;
    status: 'pending' | 'paid' | 'expired' | 'failed';
    provider?: string;
    tier: Tier;
    priceUSD: number;
    payCurrency: string;
    payAddress: string;
    payAmount: number;
}

export interface CardInitResult {
    orderId: string;
    authorizationUrl: string;
    status: string;
}

export interface SubscriptionStatus {
    active: boolean;
    tier?: Tier;
    label?: string;
    rank?: number;
    expiresAt?: string;
}

const json = async (res: Response) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || data?.message || `Request failed (${res.status})`);
    return data;
};

export const createPayment = (body: CreatePaymentBody): Promise<PaymentOrder> =>
    fetch(`${API_URL}/api/payments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then(json);

export const getPaymentOrder = (orderId: string): Promise<PaymentOrder> =>
    fetch(`${API_URL}/api/payments/${encodeURIComponent(orderId)}`).then(json);

/** Start a Paystack hosted card checkout; redirect the user to authorizationUrl. */
export const initCardPayment = (body: {
    tier: Tier;
    email: string;
    loginids: string[];
}): Promise<CardInitResult> =>
    fetch(`${API_URL}/api/payments/paystack/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then(json);

export const getSubscription = (loginids: string[]): Promise<SubscriptionStatus> => {
    if (!loginids.length) return Promise.resolve({ active: false });
    return fetch(`${API_URL}/api/subscription?loginids=${encodeURIComponent(loginids.join(','))}`).then(json);
};

export interface TierPricing {
    label: string;
    priceUSD: number;
    months: number;
    rank: number;
}

/** Public current tier prices (reflects admin overrides). */
export const getPricing = (): Promise<Record<Tier, TierPricing>> =>
    fetch(`${API_URL}/api/payments/pricing`)
        .then(json)
        .then(d => d.tiers);
