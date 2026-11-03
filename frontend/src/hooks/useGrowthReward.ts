import { useEffect, useRef, useState } from 'react';
import { checkGrowthReward, type GrowthRewardResult } from '@/services/rewards-api';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';

/** What the challenge asks for before the server has answered. */
export const DEFAULT_THRESHOLD = 500;

/**
 * The account's standing on the growth-reward ladder.
 *
 * The figure is the server's own read of the account's profit, never the
 * dashboard's: the two are derived the same way, but only the server's is the
 * one a grant is paid on.
 */
export const useGrowthReward = (monthProfit: number): GrowthRewardResult | null => {
    const { isAuthenticated, accounts } = useAuth();
    const subscription = useSubscription();
    const [result, setResult] = useState<GrowthRewardResult | null>(null);
    const refreshRef = useRef(subscription.refresh);
    refreshRef.current = subscription.refresh;

    const loginKey = accounts.map(a => a.loginid).join(',');

    useEffect(() => {
        if (!isAuthenticated || !loginKey) return;
        // Without a bearer the server has nothing to verify the profit with, and
        // an unverified figure is one this must never put on screen.
        const accessToken = OAuthTokenExchangeService.getAuthInfo()?.access_token;
        if (!accessToken) return;

        let active = true;
        checkGrowthReward({ loginids: loginKey.split(','), accessToken })
            .then(r => {
                if (!active) return;
                setResult(r);
                // A grant only takes effect once the app re-reads the
                // subscription, so unlock premium without waiting for a reload.
                if (r.granted) refreshRef.current();
            })
            .catch(() => {
                /* The dashboard works without this; stay quiet. */
            });

        return () => {
            active = false;
        };
    }, [isAuthenticated, loginKey, monthProfit]);

    return result;
};

export default useGrowthReward;
