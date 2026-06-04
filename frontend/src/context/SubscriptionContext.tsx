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

    const refresh = useCallback(() => {
        if (!isAuthenticated || loginids.length === 0) {
            setStatus({ active: false });
            setLoading(false);
            return;
        }
        setLoading(true);
        getSubscription(loginids)
            .then(setStatus)
            .catch(() => setStatus({ active: false }))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, loginKey]);

    useEffect(() => {
        refresh();
    }, [refresh]);

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
