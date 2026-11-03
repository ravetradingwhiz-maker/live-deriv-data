import { useAuth } from '@/context/AuthContext';
import useAccountGrowth from '@/hooks/useAccountGrowth';
import DashboardHero from '@/components/dashboard/DashboardHero';
import GrowthCard from '@/components/dashboard/GrowthCard';

/**
 * Dashboard — the authenticated app's landing tab.
 *
 * Replaces the Manual Trading iframe: the account's own numbers (what it made
 * this month, what it made today, how close it is to the next reward) rather
 * than an embedded trading terminal.
 */
const Dashboard = () => {
    const { balanceCurrency } = useAuth();
    const { month, day, loading, error } = useAccountGrowth();
    const currency = balanceCurrency ?? 'USD';

    return (
        <div className='space-y-6'>
            <DashboardHero monthProfit={month.profit} />

            {error && (
                <p className='rounded-xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-300'>
                    {error}
                </p>
            )}

            <div className='grid gap-4 md:grid-cols-2'>
                <GrowthCard
                    title='This Month'
                    profit={month.profit}
                    percent={month.percent}
                    trades={month.trades}
                    winRate={month.winRate}
                    buckets={month.buckets}
                    currency={currency}
                    loading={loading}
                />
                <GrowthCard
                    title='Today'
                    profit={day.profit}
                    percent={day.percent}
                    trades={day.trades}
                    winRate={day.winRate}
                    currency={currency}
                    loading={loading}
                />
            </div>
        </div>
    );
};

export default Dashboard;
