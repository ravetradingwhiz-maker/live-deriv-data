import { useCallback, useEffect, useState } from 'react';
import { getNickname, setNickname as saveNickname } from '@/services/profile-api';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';
import { useAuth } from '@/context/AuthContext';

const keyFor = (loginid: string) => `nx_nickname_${loginid}`;

export const NICKNAME_MAX = 20;

export interface Nickname {
    /** The chosen name, or null if this customer has never set one. */
    nickname: string | null;
    /** False until the server has answered. */
    loaded: boolean;
    /**
     * The server positively confirmed there is no name yet.
     *
     * Never true merely because the request failed or is still in flight: the
     * prompt cannot be dismissed, so a network blip must not trap someone who
     * already has a name behind an unclosable dialog.
     */
    shouldPrompt: boolean;
    save: (value: string) => void;
    saving: boolean;
    error: string | null;
}

const readCache = (loginid: string | null): string | null => {
    if (!loginid) return null;
    try {
        const stored = localStorage.getItem(keyFor(loginid));
        return stored && stored.trim() ? stored : null;
    } catch {
        return null;
    }
};

const writeCache = (loginid: string | null, value: string) => {
    if (!loginid) return;
    try {
        localStorage.setItem(keyFor(loginid), value);
    } catch {
        /* Private browsing, or storage blocked. The server still has it. */
    }
};

/**
 * The name the user has chosen for themselves.
 *
 * The server owns it, so it follows them to a new device. localStorage is kept
 * only as a cache, so the greeting renders instantly instead of flashing the
 * loginid on every load — and a name set before this moved server-side is
 * pushed up once rather than lost.
 */
export const useNickname = (loginid: string | null): Nickname => {
    const { accounts } = useAuth();
    const [nickname, setNicknameState] = useState<string | null>(() => readCache(loginid));
    const [loaded, setLoaded] = useState(false);
    const [confirmedMissing, setConfirmedMissing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loginKey = accounts.map(a => a.loginid).join(',');

    const save = useCallback(
        (value: string) => {
            const trimmed = value.trim().slice(0, NICKNAME_MAX);
            const accessToken = OAuthTokenExchangeService.getAuthInfo()?.access_token;
            if (!trimmed || !loginKey || !accessToken) return;

            setSaving(true);
            setError(null);
            saveNickname({ loginids: loginKey.split(','), accessToken, nickname: trimmed })
                .then(r => {
                    setNicknameState(r.nickname);
                    setConfirmedMissing(false);
                    writeCache(loginid, r.nickname);
                })
                .catch((e: unknown) => {
                    setError(e instanceof Error ? e.message : 'Could not save your nickname');
                })
                .finally(() => setSaving(false));
        },
        [loginKey, loginid]
    );

    useEffect(() => {
        if (!loginid || !loginKey) return;

        let active = true;
        // Show the cached name immediately; the server's answer replaces it.
        setNicknameState(readCache(loginid));

        getNickname(loginKey.split(','))
            .then(r => {
                if (!active) return;
                setLoaded(true);

                if (r.nickname) {
                    setNicknameState(r.nickname);
                    setConfirmedMissing(false);
                    writeCache(loginid, r.nickname);
                    return;
                }

                /* The server has none. If this browser still holds one from
                   before the move server-side, push it up rather than asking
                   the user to type it again. */
                const cached = readCache(loginid);
                if (cached) {
                    save(cached);
                    return;
                }
                setConfirmedMissing(true);
            })
            .catch(() => {
                // Unreachable: keep whatever the cache had and do not prompt.
                if (active) setLoaded(true);
            });

        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loginid, loginKey]);

    return {
        nickname,
        loaded,
        shouldPrompt: loaded && confirmedMissing && !nickname,
        save,
        saving,
        error,
    };
};

export default useNickname;
