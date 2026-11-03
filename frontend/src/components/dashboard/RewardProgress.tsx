import { useEffect, useRef, useState } from 'react';
import { Gift } from 'lucide-react';
import { checkGrowthReward, type GrowthRewardResult } from '@/services/rewards-api';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';

interface RewardProgressProps {
    /** Month profit, watched so a closing trade re-checks the ladder. */
    monthProfit: number;
}

const fmt = (value: number): string =>
    value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/**
 * Progress toward the next growth reward.
 *
 * The figure on the bar is the server's own read of the account's profit, not
 * the dashboard's — the two are derived the same way, but only the server's is
 * the one a grant is paid on.
 */
const RewardProgress = ({ monthProfit }: RewardProgressProps) => {
    const { isAuthenticated, accounts } = useAuth();
    const subscription = useSubscription();
    const [result, setResult] = useState<GrowthRewardResult | null>(null);
    const refreshRef = useRef(subscription.refresh);
    refreshRef.current = subscription.refresh;

    const loginKey = accounts.map(a => a.loginid).join(',');

    useEffect(() => {
        if (!isAuthenticated || !loginKey) return;
        // Without a bearer the server has nothing to verify the profit with, and
        // an unverified figure is one this card must never put on screen.
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
                /* The dashboard works without this card; stay quiet. */
            });

        return () => {
            active = false;
        };
    }, [isAuthenticated, loginKey, monthProfit]);

    if (!result) return null;

    const { profit, threshold, granted } = result;
    const pct = threshold > 0 ? Math.max(0, Math.min(1, profit / threshold)) : 0;

    return (
        <div className='rounded-xl border border-line bg-ink-800 p-4'>
            <div className='flex items-center gap-2'>
                <Gift size={16} className='shrink-0 text-amber-400' />
                <p className='text-sm text-slate-300'>
                    <span className='font-mono font-semibold text-white'>${fmt(Math.max(0, profit))}</span>
                    <span className='text-slate-500'> of </span>
                    <span className='font-mono font-semibold text-white'>${fmt(threshold)}</span>
                    <span className='text-slate-500'> toward 3 days Alpha</span>
                </p>
            </div>

            <div className='mt-3 h-2 overflow-hidden rounded-full bg-ink-600'>
                <div
                    className='h-full rounded-full bg-amber-400 transition-[width] duration-500'
                    style={{ width: `${pct * 100}%` }}
                />
            </div>

            {granted && (
                <p className='mt-2 text-xs font-semibold text-emerald-400'>
                    3 days Alpha unlocked
                </p>
            )}
        </div>
    );
};

export default RewardProgress;
