/** Client for the growth-reward endpoint (live-deriv-data/server). */

// Same convention as payments-api: empty by default, so calls are same-origin
// and the Vite dev server proxies them to the backend.
const API_URL = (process.env.API_URL || '').replace(/\/$/, '');

export interface GrowthRewardResult {
    /** All-time realised profit, as the server read it from Deriv. */
    profit: number;
    /** What the next grant costs. Already doubled if this call granted one. */
    threshold: number;
    grantsClaimed: number;
    granted: boolean;
    expiresAt: string | null;
}

const json = async (res: Response) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || data?.message || `Request failed (${res.status})`);
    return data;
};

/**
 * Asks the server to check the account's growth and grant the reward if it has
 * earned one. The profit is never sent — only the token the server reads it
 * with — so the client cannot talk its way into premium.
 */
export const checkGrowthReward = (body: {
    loginids: string[];
    accessToken: string;
}): Promise<GrowthRewardResult> =>
    fetch(`${API_URL}/api/rewards/growth/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then(json);
