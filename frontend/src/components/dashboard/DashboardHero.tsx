import { Link } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useAuth } from '@/context/AuthContext';
import useAccountName from '@/hooks/useAccountName';
import useGrowthReward, { DEFAULT_THRESHOLD } from '@/hooks/useGrowthReward';
import RewardLadder from '@/components/dashboard/RewardLadder';
import RewardClaimedModal from '@/components/dashboard/RewardClaimedModal';

interface DashboardHeroProps {
    /** Month profit, watched so a closing trade re-checks the ladder. */
    monthProfit: number;
}

const fmt = (value: number): string =>
    value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/**
 * The dashboard's top card: the greeting and the way into the bots on the left,
 * the robot in the middle, and the robot's own words on the right — a bubble
 * at its head, the challenge beneath it, and how far the account has got
 * toward winning it.
 *
 * The Lottie is played in its own colours rather than tinted to the brand —
 * recolouring an animation layer by layer is how you get a muddy one.
 */
const DashboardHero = ({ monthProfit }: DashboardHeroProps) => {
    const { activeLoginId } = useAuth();
    const name = useAccountName();
    const { status, grant, claiming, claimError, claim, dismissGrant } = useGrowthReward(monthProfit);

    // Until the server answers, the challenge names the opening target. After a
    // grant the bar doubles, so the copy must follow it rather than keep
    // promising a figure the account has already passed.
    const threshold = status?.threshold ?? DEFAULT_THRESHOLD;

    return (
        <section className='rounded-xl border border-line bg-ink-800/50 p-4 sm:p-6'>
            <div className='grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.15fr)] md:items-start md:gap-2'>
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
                        className='mt-4 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-2.5 text-sm font-bold text-[#1a1205] shadow-[0_2px_12px_rgba(245,158,11,0.35)] transition-all hover:from-amber-200 hover:to-amber-400'
                    >
                        Start Trading
                    </Link>
                </div>

                {/* Middle — the robot. On a phone it sits above the bubble, so the
                    tail points up at it; side by side, it points left at it. */}
                <div className='flex justify-center md:-mr-2'>
                    <DotLottieReact
                        src='/hero.json'
                        loop
                        autoplay
                        className='h-40 w-40 shrink-0 sm:h-48 sm:w-48'
                    />
                </div>

                {/* Right — what the robot has to say. */}
                <div className='flex flex-col gap-3'>
                    <div className='relative rounded-2xl border border-line bg-ink-800 px-4 py-3 shadow-lg shadow-black/40 md:mt-10'>
                        <p className='text-lg font-bold text-white sm:text-xl'>
                            Hello{name ? `, ${name}` : ''}
                        </p>
                        {/* Tail: up at the robot above it on a phone, left at its
                            mouth once the columns sit side by side. */}
                        <span
                            aria-hidden
                            className='absolute -top-[8px] left-1/2 h-0 w-0 -translate-x-1/2 border-b-[8px] border-l-[8px] border-r-[8px] border-b-line border-l-transparent border-r-transparent md:left-[-8px] md:top-5 md:translate-x-0 md:border-b-[8px] md:border-l-0 md:border-r-[8px] md:border-t-[8px] md:border-b-transparent md:border-r-line md:border-t-transparent'
                        />
                    </div>

                    <div>
                        <p className='text-xs font-semibold uppercase tracking-wider text-amber-400'>
                            Challenge just for YOU !
                        </p>
                        <p className='mt-1 text-sm leading-relaxed text-slate-300'>
                            Trade to a profit of{' '}
                            <span className='font-semibold text-white'>${fmt(threshold)}</span> to get Nexora AI
                            premium 3 days for free
                        </p>
                    </div>

                    {status && (
                        <RewardLadder
                            profit={status.profit}
                            threshold={status.threshold}
                            claimable={status.claimable}
                            claiming={claiming}
                            error={claimError}
                            onClaim={claim}
                        />
                    )}
                </div>
            </div>

            {grant && <RewardClaimedModal grant={grant} onClose={dismissGrant} />}
        </section>
    );
};

export default DashboardHero;
