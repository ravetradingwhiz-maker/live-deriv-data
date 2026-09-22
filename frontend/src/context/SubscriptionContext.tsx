import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getSubscription, type SubscriptionStatus, type Tier } from '@/services/payments-api';
import { useAuth } from '@/context/AuthContext';

const TIER_RANK: Record<Tier, number> = { alpha: 1, quantum: 2, apex: 3 };

interface SubscriptionContextValue extends SubscriptionStatus {
    loading: boolean;
    /** True if the active subscription covers (>=) the given tier. */
    covers: (tier: Tier) => boolean;
    refresh: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

/**
 * Checks the logged-in user's Deriv loginids (real + demo) against the payment
 * server and exposes the active premium tier. Lives above the app tabs.
 */
export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated, accounts } = useAuth();
    const [status, setStatus] = useState<SubscriptionStatus>({ active: false });
    const [loading, setLoading] = useState(true);

    const loginids = useMemo(() => accounts.map(a => a.loginid), [accounts]);
    const loginKey = loginids.join(',');

    /**
     * `silent` is for background revalidation: no spinner, and a failed request
     * leaves the last known answer in place. A network blip must not read as
     * "subscription cancelled" and lock a paying user out of the app.
     */
    const fetchStatus = useCallback(
        (opts?: { silent?: boolean }) => {
            if (!isAuthenticated || loginids.length === 0) {
                setStatus({ active: false });
                setLoading(false);
                return;
            }
            if (!opts?.silent) setLoading(true);
            getSubscription(loginids)
                .then(setStatus)
                .catch(() => {
                    if (!opts?.silent) setStatus({ active: false });
                })
                .finally(() => setLoading(false));
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [isAuthenticated, loginKey]
    );

    const refresh = useCallback(() => fetchStatus(), [fetchStatus]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    /* The answer is true only for the moment it was fetched, and this app is
       installed as a PWA — a session stays open for days. Without the two
       effects below, a subscription that lapses mid-session keeps working until
       the next cold start. */

    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') fetchStatus({ silent: true });
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [fetchStatus]);

    useEffect(() => {
        if (!status.active || !status.expiresAt) return;
        const ms = new Date(status.expiresAt).getTime() - Date.now();
        if (ms <= 0) {
            fetchStatus({ silent: true });
            return;
        }
        /* setTimeout saturates above ~24.8 days and would then fire at once, so
           a distant expiry is capped and the effect re-arms on each wake. */
        const t = setTimeout(() => fetchStatus({ silent: true }), Math.min(ms + 1000, 6 * 60 * 60 * 1000));
        return () => clearTimeout(t);
    }, [status.active, status.expiresAt, fetchStatus]);

    const covers = useCallback(
        (tier: Tier) => !!status.active && (status.rank ?? 0) >= TIER_RANK[tier],
        [status]
    );

    const value = useMemo<SubscriptionContextValue>(
        () => ({ ...status, loading, covers, refresh }),
        [status, loading, covers, refresh]
    );

    return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

export const useSubscription = (): SubscriptionContextValue => {
    const ctx = useContext(SubscriptionContext);
    if (!ctx) throw new Error('useSubscription must be used within a SubscriptionProvider');
    return ctx;
};

/** Like useSubscription but returns null outside a provider (e.g. public pages). */
export const useSubscriptionOptional = (): SubscriptionContextValue | null => useContext(SubscriptionContext);
