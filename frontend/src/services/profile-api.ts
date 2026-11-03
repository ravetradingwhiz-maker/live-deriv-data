/** Client for the profile endpoints (live-deriv-data/server). */

const API_URL = (process.env.API_URL || '').replace(/\/$/, '');

const json = async (res: Response) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || data?.message || `Request failed (${res.status})`);
    return data;
};

/** The name this customer has chosen, or null if they never have. */
export const getNickname = (loginids: string[]): Promise<{ nickname: string | null }> =>
    fetch(`${API_URL}/api/profile?loginids=${encodeURIComponent(loginids.join(','))}`).then(json);

/**
 * Saves the chosen name. The token goes with it because the server proves the
 * caller owns the account before writing — a loginid alone proves nothing.
 */
export const setNickname = (body: {
    loginids: string[];
    accessToken: string;
    nickname: string;
}): Promise<{ nickname: string }> =>
    fetch(`${API_URL}/api/profile/nickname`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then(json);
