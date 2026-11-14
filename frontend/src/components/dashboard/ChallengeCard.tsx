import { ArrowRight, Crown } from 'lucide-react';

interface ChallengeCardProps {
    /** Realised profit, as the server read it. */
    profit: number;
    /** What the next grant costs. Doubles after each one. */
    threshold: number;
}

const fmt = (value: number): string =>
    value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** Scrolls to the hero, where the claim lives. */
const showDetails = () => {
    document.getElementById('challenge')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/** The share of the target, as a ring with the figure in the middle. */
const ProgressRing = ({ fraction }: { fraction: number }) => {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className='relative h-28 w-28 shrink-0'>
            <svg viewBox='0 0 100 100' className='h-full w-full -rotate-90' aria-hidden>
                <circle cx='50' cy='50' r={radius} fill='none' strokeWidth='7' className='stroke-ink-600' />
                <circle
                    cx='50'
                    cy='50'
                    r={radius}
                    fill='none'
                    strokeWidth='7'
                    strokeLinecap='round'
                    strokeDasharray={`${circumference * fraction} ${circumference}`}
                    className='stroke-cyan-400 transition-[stroke-dasharray] duration-700'
                />
            </svg>
            <span className='absolute inset-0 flex items-center justify-center font-mono text-2xl font-bold text-white'>
                {Math.round(fraction * 100)}%
            </span>
        </div>
    );
};

/**
 * The challenge, restated at the foot of the dashboard.
 *
 * The claim button is not repeated here — it belongs with the bar in the hero,
 * and two places to claim one reward is one too many. This shows where the
 * account has got to and leads back up to it.
 */
const ChallengeCard = ({ profit, threshold }: ChallengeCardProps) => {
    const fraction = threshold > 0 ? Math.max(0, Math.min(1, profit / threshold)) : 0;

    return (
        <section className='rounded-xl border border-line bg-ink-800/60 p-4 sm:p-5'>
            <header className='flex items-center justify-between gap-3'>
                <div className='flex min-w-0 items-center gap-3'>
                    <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-400/50 bg-amber-400/10'>
                        <Crown size={17} className='text-amber-300' />
                    </span>
                    <h2 className='truncate text-base font-bold text-white sm:text-lg'>Challenge Progress</h2>
                </div>
                <button
                    type='button'
                    onClick={showDetails}
                    className='inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-cyan-300 transition-colors hover:text-cyan-200'
                >
                    View Details
                    <ArrowRight size={13} />
                </button>
            </header>

            <div className='mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center'>
                <ProgressRing fraction={fraction} />

                <div className='min-w-0 flex-1 text-center sm:text-left'>
                    <p className='text-sm text-slate-300'>
                        <span className='font-mono text-lg font-bold text-white'>${fmt(Math.max(0, profit))}</span>
                        <span className='text-slate-500'> of </span>
                        <span className='font-mono text-lg font-bold text-white'>${fmt(threshold)}</span>
                    </p>

                    <div className='mt-2 h-2 overflow-hidden rounded-full bg-ink-600'>
                        <div
                            className='h-full rounded-full bg-cyan-400 transition-[width] duration-700'
                            style={{ width: `${fraction * 100}%` }}
                        />
                    </div>

                    <p className='mt-3 text-xs leading-relaxed text-slate-400'>
                        Trade to reach ${fmt(threshold)} and unlock{' '}
                        <span className='font-semibold text-amber-300'>3 days of Nexora AI Premium!</span>
                    </p>

                    <span className='mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300'>
                        <Crown size={13} />3 Days Free
                    </span>
                </div>
            </div>
        </section>
    );
};

export default ChallengeCard;
