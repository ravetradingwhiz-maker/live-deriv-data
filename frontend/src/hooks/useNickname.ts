import { useCallback, useEffect, useState } from 'react';

const keyFor = (loginid: string) => `nx_nickname_${loginid}`;
/** Per-tab, so declining once does not re-prompt on every navigation. */
const SKIP_KEY = 'nx_nickname_skipped';

export const NICKNAME_MAX = 20;

export interface Nickname {
    /** The stored nickname, or null if this account has never set one. */
    nickname: string | null;
    /** False until localStorage has been read, so nothing flashes first. */
    loaded: boolean;
    /** No nickname yet and the prompt has not been dismissed this session. */
    shouldPrompt: boolean;
    save: (value: string) => void;
    skip: () => void;
}

/**
 * A name the user picks for themselves, shown instead of their loginid.
 *
 * Kept in localStorage against the loginid rather than on the server: it is a
 * display preference, and putting it server-side would mean a write endpoint
 * that has to verify a Deriv token on every save to stop anyone renaming
 * anyone. The cost is that it does not follow the user to another device.
 */
export const useNickname = (loginid: string | null): Nickname => {
    const [nickname, setNickname] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [skipped, setSkipped] = useState(false);

    useEffect(() => {
        if (!loginid) {
            setNickname(null);
            setLoaded(false);
            return;
        }
        try {
            const stored = localStorage.getItem(keyFor(loginid));
            setNickname(stored && stored.trim() ? stored : null);
            setSkipped(sessionStorage.getItem(SKIP_KEY) === '1');
        } catch {
            // Private browsing, or storage blocked. The greeting falls back to
            // the loginid, which is always available.
            setNickname(null);
        }
        setLoaded(true);
    }, [loginid]);

    const save = useCallback(
        (value: string) => {
            const trimmed = value.trim().slice(0, NICKNAME_MAX);
            if (!loginid || !trimmed) return;
            setNickname(trimmed);
            try {
                localStorage.setItem(keyFor(loginid), trimmed);
            } catch {
                /* Held in memory for this session instead. */
            }
        },
        [loginid]
    );

    const skip = useCallback(() => {
        setSkipped(true);
        try {
            sessionStorage.setItem(SKIP_KEY, '1');
        } catch {
            /* Held in memory for this session instead. */
        }
    }, []);

    return {
        nickname,
        loaded,
        shouldPrompt: loaded && !nickname && !skipped && !!loginid,
        save,
        skip,
    };
};

export default useNickname;
