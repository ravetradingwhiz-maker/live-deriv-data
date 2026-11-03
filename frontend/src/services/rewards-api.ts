/** Client for the growth-reward endpoints (live-deriv-data/server). */

// Same convention as payments-api: empty by default, so calls are same-origin
// and the Vite dev server proxies them to the backend.
const API_URL = (process.env.API_URL || '').replace(/\/$/, '');

export interface GrowthRewardStatus {
    /** All-time realised profit, as the server read it from Deriv. */
    profit: number;
    /** What the next grant costs. Doubles after each one. */
    threshold: number;
    grantsClaimed: number;
    /** Profit has reached the target; the reward is waiting to be claimed. */
    claimable: boolean;
}

export interface GrowthRewardGrant {
    granted: true;
    profit: number;
    tier: string;
    days: number;
    expiresAt: string;
    /** The new, doubled target. */
    threshold: number;
    grantsClaimed: number;
}

const json = async (res: Response) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || data?.message || `Request failed (${res.status})`);
    return data;
};

const post = (path: string, body: unknown) =>
    fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then(json);

interface GrowthRewardBody {
    loginids: string[];
    accessToken: string;
}

/**
 * Where the account stands on the ladder. Read-only — it never grants, so the
 * reward cannot be handed over before the user has claimed it.
 *
 * The profit is never sent, only the token the server reads it with, so the
 * client cannot talk its way into premium.
 */
export const checkGrowthReward = (body: GrowthRewardBody): Promise<GrowthRewardStatus> =>
    post('/api/rewards/growth/check', body);

/** Claims the 3 days, on a profit the server verifies again as it grants. */
export const claimGrowthReward = (body: GrowthRewardBody): Promise<GrowthRewardGrant> =>
    post('/api/rewards/growth/claim', body);
