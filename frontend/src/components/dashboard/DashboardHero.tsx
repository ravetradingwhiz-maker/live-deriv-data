import { Link } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useAuth } from '@/context/AuthContext';
import useAccountName from '@/hooks/useAccountName';
import useGrowthReward, { DEFAULT_THRESHOLD } from '@/hooks/useGrowthReward';
import RewardLadder from '@/components/dashboard/RewardLadder';

interface DashboardHeroProps {
    /** Month profit, watched so a closing trade re-checks the ladder. */
    monthProfit: number;
}

const fmt = (value: number): string =>
    value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/**
 * The dashboard's top card: the greeting and the way into the bots on the left,
 * the robot in the middle, and the robot's own words on the right — a bubble
 * reaching from its head to the top corner, the challenge beneath it, and how
 * far the account has got toward winning it.
 *
 * The Lottie is played in its own colours rather than tinted to the brand —
 * recolouring an animation layer by layer is how you get a muddy one.
 */
const DashboardHero = ({ monthProfit }: DashboardHeroProps) => {
    const { activeLoginId } = useAuth();
    const name = useAccountName();
    const reward = useGrowthReward(monthProfit);

    // Until the server answers, the challenge names the opening target. After a
    // grant the bar doubles, so the copy must follow it rather than keep
    // promising a figure the account has already passed.
    const threshold = reward?.threshold ?? DEFAULT_THRESHOLD;

    return (
        <section className='rounded-xl border border-line bg-ink-800/50 p-4 sm:p-6'>
            <div className='grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.15fr)] md:gap-5'>
                {/* Left — greeting, account, and the way in. */}
                <div className='flex flex-col items-center text-center md:items-start md:text-left'>
                    <h1 className='text-3xl font-bold leading-tight text-white sm:text-4xl'>Welcome Back</h1>
                    {activeLoginId && (
                        <p className='mt-1 font-mono text-lg font-semibold text-cyan-400 sm:text-xl'>
                            {activeLoginId}
                        </p>
                    )}
                    <Link
                        to='/app/trade-pilot-free'
                        className='mt-4 inline-flex items-center justify-center rounded-full border border-cyan-400 bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(34,211,238,0.6),0_0_18px_rgba(34,211,238,0.45)] transition-colors hover:bg-cyan-500'
                    >
                        Start Trading
                    </Link>
                </div>

                {/* Middle — the robot. */}
                <div className='flex justify-center'>
                    <DotLottieReact
                        src='/hero.json'
                        loop
                        autoplay
                        className='h-40 w-40 shrink-0 sm:h-48 sm:w-48'
                    />
                </div>

                {/* Right — what the robot has to say. */}
                <div className='flex flex-col gap-3'>
                    <div className='relative rounded-2xl border border-line bg-ink-800 px-4 py-3 shadow-lg shadow-black/40'>
                        <p className='text-lg font-bold text-white sm:text-xl'>
                            Hello{name ? `, ${name}` : ''}
                        </p>
                        {/* Tail: points down at the robot on a stacked phone
                            layout, left at it once the columns sit side by side. */}
                        <span
                            aria-hidden
                            className='absolute -bottom-[8px] left-6 h-0 w-0 border-l-[8px] border-t-[8px] border-l-transparent border-t-line md:bottom-auto md:left-[-8px] md:top-6 md:border-b-[8px] md:border-l-0 md:border-r-[8px] md:border-t-[8px] md:border-b-transparent md:border-r-line md:border-t-transparent'
                        />
                    </div>

                    <div>
                        <p className='text-xs font-semibold uppercase tracking-wider text-amber-400'>Challenge</p>
                        <p className='mt-1 text-sm leading-relaxed text-slate-300'>
                            Trade to a profit of{' '}
                            <span className='font-semibold text-white'>${fmt(threshold)}</span> to get Nexora AI
                            premium 3 days for free
                        </p>
                    </div>

                    {reward && (
                        <RewardLadder
                            profit={reward.profit}
                            threshold={reward.threshold}
                            granted={reward.granted}
                        />
                    )}
                </div>
            </div>
        </section>
    );
};

export default DashboardHero;
