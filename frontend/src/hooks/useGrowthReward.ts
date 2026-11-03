import { useCallback, useEffect, useRef, useState } from 'react';
import {
    checkGrowthReward,
    claimGrowthReward,
    type GrowthRewardGrant,
    type GrowthRewardStatus,
} from '@/services/rewards-api';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';

/** What the challenge asks for before the server has answered. */
export const DEFAULT_THRESHOLD = 500;

export interface GrowthReward {
    status: GrowthRewardStatus | null;
    /** Why the read failed, if it did. */
    statusError: string | null;
    /** The grant just made, which the success modal is shown for. */
    grant: GrowthRewardGrant | null;
    claiming: boolean;
    claimError: string | null;
    claim: () => void;
    dismissGrant: () => void;
}

/**
 * The account's standing on the growth-reward ladder, and the claim action.
 *
 * The figure is the server's own read of the account's profit, never the
 * dashboard's: the two are derived the same way, but only the server's is the
 * one a grant is paid on.
 */
export const useGrowthReward = (monthProfit: number): GrowthReward => {
    const { isAuthenticated, accounts, activeLoginId } = useAuth();
    const subscription = useSubscription();
    const [status, setStatus] = useState<GrowthRewardStatus | null>(null);
    const [grant, setGrant] = useState<GrowthRewardGrant | null>(null);
    const [claiming, setClaiming] = useState(false);
    const [claimError, setClaimError] = useState<string | null>(null);
    const [statusError, setStatusError] = useState<string | null>(null);
    const refreshRef = useRef(subscription.refresh);
    refreshRef.current = subscription.refresh;

    /* Active account FIRST. The server reads the statement of loginids[0], and
       `accounts` comes back in Deriv's storage order — so without this it could
       read a different account than the one being traded on and report zero. */
    const loginKey = [
        ...(activeLoginId ? [activeLoginId] : []),
        ...accounts.map(a => a.loginid).filter(id => id !== activeLoginId),
    ].join(',');

    // Without a bearer the server has nothing to verify the profit with, and an
    // unverified figure is one this must never put on screen.
    const credentials = useCallback((): { loginids: string[]; accessToken: string } | null => {
        const accessToken = OAuthTokenExchangeService.getAuthInfo()?.access_token;
        if (!accessToken || !loginKey) return null;
        return { loginids: loginKey.split(','), accessToken };
    }, [loginKey]);

    useEffect(() => {
        if (!isAuthenticated) return;
        const creds = credentials();
        if (!creds) return;

        let active = true;
        checkGrowthReward(creds)
            .then(r => {
                if (!active) return;
                setStatus(r);
                setStatusError(null);
                // Says whether a zero means no trades, no settled trades, or
                // trades bought under an app id the server is not looking for.
                if (r.debug) console.info('[Growth] challenge read', r.debug);
            })
            .catch((e: unknown) => {
                if (!active) return;
                // Shown rather than swallowed: a silent failure here is
                // indistinguishable from an account that simply has not traded.
                setStatusError(e instanceof Error ? e.message : 'Could not read your profit');
            });

        return () => {
            active = false;
        };
    }, [isAuthenticated, credentials, monthProfit]);

    const claim = useCallback(() => {
        const creds = credentials();
        if (!creds || claiming) return;

        setClaiming(true);
        setClaimError(null);
        claimGrowthReward(creds)
            .then(g => {
                setGrant(g);
                // Premium only takes effect once the app re-reads the
                // subscription, so unlock it without waiting for a reload.
                refreshRef.current();
                // Reflect the doubled target straight away.
                setStatus({
                    profit: g.profit,
                    threshold: g.threshold,
                    grantsClaimed: g.grantsClaimed,
                    claimable: g.profit >= g.threshold,
                });
            })
            .catch((e: unknown) => {
                setClaimError(e instanceof Error ? e.message : 'Could not claim your reward');
            })
            .finally(() => setClaiming(false));
    }, [credentials, claiming]);

    const dismissGrant = useCallback(() => setGrant(null), []);

    return { status, statusError, grant, claiming, claimError, claim, dismissGrant };
};

export default useGrowthReward;
