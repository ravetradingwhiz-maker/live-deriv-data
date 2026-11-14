import { useState } from 'react';
import { ArrowRight, CalendarDays, Clock, Repeat, Target, TrendingUp, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAdminOptional } from '@/context/AdminContext';
import useAccountGrowth from '@/hooks/useAccountGrowth';
import useGrowthReward, { DEFAULT_THRESHOLD } from '@/hooks/useGrowthReward';
import DashboardHero from '@/components/dashboard/DashboardHero';
import StatCard from '@/components/dashboard/StatCard';
import SectionCard from '@/components/dashboard/SectionCard';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import RecentActivity from '@/components/dashboard/RecentActivity';
import ChallengeCard from '@/components/dashboard/ChallengeCard';
import QuickAccess from '@/components/dashboard/QuickAccess';
import PromoBanner from '@/components/dashboard/PromoBanner';

const EM_DASH = '—';

/**
 * Money the way the reference shows it — `$0.00` — but only where the symbol
 * is true. An account held in anything other than dollars gets its own code
 * rather than a dollar sign over the wrong currency.
 */
const fmtMoney = (value: number, currency: string): string => {
    const body = Math.abs(value).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const sign = value < 0 ? '-' : '';
    return currency === 'USD' ? `${sign}$${body}` : `${sign}${body} ${currency}`;
};

/**
 * Dashboard — the authenticated app's landing tab.
 *
 * The account's own numbers: what it made today and this month, how much it
 * has traded, how it is doing against the reward target, and what settled
 * most recently.
 *
 * Every figure here comes from one read of the Deriv profit table, held by
 * `useAccountGrowth` — the tiles, the curve and the activity list are three
 * views of the same rows, so they cannot disagree with one another.
 */
const Dashboard = () => {
    const { balanceCurrency } = useAuth();
    const { month, day, recent, loading, error } = useAccountGrowth();

    /*
     * The growth challenge is not offered to an admin account, so neither the
     * hero panel nor the progress card is drawn for one — and the server is
     * not asked about a reward it would never grant.
     *
     * Keyed on eligibility rather than on admin mode being switched on: an
     * admin who steps out of admin mode is still an admin, and the challenge
     * blinking back into the page would be the wrong answer.
     */
    const admin = useAdminOptional();
    const isAdmin = Boolean(admin?.eligible);

    const reward = useGrowthReward(month.profit, !isAdmin);
    const [showAllActivity, setShowAllActivity] = useState(false);

    const currency = balanceCurrency ?? 'USD';
    const threshold = reward.status?.threshold ?? DEFAULT_THRESHOLD;
    const monthName = new Date().toLocaleString(undefined, { month: 'long' });

    return (
        <div className='space-y-4 sm:space-y-6'>
            <DashboardHero reward={isAdmin ? undefined : reward} />

            {error && (
                <p className='rounded-xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-300'>
                    {error}
                </p>
            )}

            <div className='grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4'>
                <StatCard
                    label="Today's Profit"
                    value={fmtMoney(day.profit, currency)}
                    caption={`${day.trades} ${day.trades === 1 ? 'trade' : 'trades'} today`}
                    icon={TrendingUp}
                    tone='emerald'
                    valueClass={day.profit < 0 ? 'text-rose-400' : 'text-emerald-400'}
                    loading={loading}
                />
                <StatCard
                    label='Monthly Profit'
                    value={fmtMoney(month.profit, currency)}
                    caption={`${monthName} performance`}
                    icon={CalendarDays}
                    tone='violet'
                    valueClass={month.profit < 0 ? 'text-rose-400' : 'text-white'}
                    buckets={month.buckets}
                    loading={loading}
                />
                <StatCard
                    label='Total Trades'
                    value={String(month.trades)}
                    /* Month-to-date: the profit table is read from the first of
                       the month, so this cannot claim to be an all-time count. */
                    caption={`${monthName} to date`}
                    icon={Repeat}
                    tone='cyan'
                    buckets={month.buckets}
                    loading={loading}
                />
                <StatCard
                    label='Win Rate'
                    value={month.winRate === null ? EM_DASH : `${Math.round(month.winRate * 100)}%`}
                    caption={month.winRate === null ? 'Awaiting trade history' : `${monthName} to date`}
                    icon={Target}
                    tone='amber'
                    rate={month.winRate}
                    loading={loading}
                />
            </div>

            <div className='grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]'>
                <SectionCard
                    icon={TrendingUp}
                    tone='cyan'
                    title='Performance Overview'
                    subtitle='Track your account performance over time.'
                >
                    <PerformanceChart buckets={month.buckets} target={threshold} loading={loading} />
                </SectionCard>

                <div className='flex flex-col gap-4'>
                    <SectionCard
                        icon={Clock}
                        tone='cyan'
                        title='Recent Activity'
                        className='flex-1'
                        action={
                            recent.length > 5 && (
                                <button
                                    type='button'
                                    onClick={() => setShowAllActivity(current => !current)}
                                    className='inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 transition-colors hover:text-cyan-200'
                                >
                                    {showAllActivity ? 'Show less' : 'View all'}
                                    <ArrowRight size={13} />
                                </button>
                            )
                        }
                    >
                        <RecentActivity
                            rows={recent}
                            currency={currency}
                            loading={loading}
                            limit={showAllActivity ? recent.length : 5}
                        />
                    </SectionCard>

                    {!isAdmin && <ChallengeCard profit={reward.status?.profit ?? 0} threshold={threshold} />}
                </div>
            </div>

            <SectionCard
                icon={Zap}
                tone='cyan'
                title='Quick Access'
                subtitle='Explore our platforms and tools.'
            >
                <QuickAccess />
            </SectionCard>

            <PromoBanner />
        </div>
    );
};

export default Dashboard;
