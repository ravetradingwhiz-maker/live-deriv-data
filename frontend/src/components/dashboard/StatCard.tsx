import type { LucideIcon } from 'lucide-react';
import Sparkline from '@/components/dashboard/Sparkline';

export type StatTone = 'emerald' | 'violet' | 'cyan' | 'amber';

/** Icon colour and the disc behind it, per measure. */
const TONES: Record<StatTone, { fg: string; disc: string }> = {
    emerald: { fg: 'text-emerald-400', disc: 'bg-emerald-400/10' },
    violet: { fg: 'text-violet-300', disc: 'bg-violet-300/10' },
    cyan: { fg: 'text-cyan-300', disc: 'bg-cyan-300/10' },
    amber: { fg: 'text-amber-300', disc: 'bg-amber-300/10' },
};

interface StatCardProps {
    label: string;
    /** Already formatted — the card does not know whether it holds money. */
    value: string;
    caption: string;
    icon: LucideIcon;
    tone: StatTone;
    valueClass?: string;
    /** A curve, for a measure with a series behind it. */
    buckets?: number[];
    /** A ring instead, for a rate. Null draws the empty track. */
    rate?: number | null;
    loading: boolean;
}

/** The ring on the win-rate tile: a faint track, filled clockwise by the rate. */
const Ring = ({ rate }: { rate: number | null }) => {
    const radius = 15;
    const circumference = 2 * Math.PI * radius;

    return (
        <svg viewBox='0 0 36 36' className='h-10 w-10 -rotate-90' aria-hidden>
            <circle cx='18' cy='18' r={radius} fill='none' strokeWidth='3' className='stroke-ink-600' />
            {rate !== null && (
                <circle
                    cx='18'
                    cy='18'
                    r={radius}
                    fill='none'
                    strokeWidth='3'
                    strokeLinecap='round'
                    strokeDasharray={`${circumference * Math.max(0, Math.min(1, rate))} ${circumference}`}
                    className='stroke-amber-300 transition-[stroke-dasharray] duration-500'
                />
            )}
        </svg>
    );
};

/**
 * One figure from the account, with what it measures beside it.
 *
 * The tile carries a formatted string rather than a number: today's profit is
 * money, total trades is a count and the win rate is a percentage or a dash,
 * and none of that belongs in a tile.
 */
const StatCard = ({
    label,
    value,
    caption,
    icon: Icon,
    tone,
    valueClass = 'text-white',
    buckets,
    rate,
    loading,
}: StatCardProps) => {
    const { fg, disc } = TONES[tone];
    const hasCurve = Boolean(buckets && buckets.length > 1);

    return (
        <div className='rounded-xl border border-line bg-ink-800/60 p-4 sm:p-5'>
            {/* Stacked on a phone — two tiles to a row leaves no width for a
                disc and a label side by side — and inline from `sm` up, which
                is how the desktop reference has it. */}
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3'>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${disc}`}>
                    <Icon size={17} className={fg} />
                </span>
                <p className='min-w-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400'>{label}</p>
            </div>

            {loading ? (
                /* Shaped like the loaded tile so the figure lands in place
                   rather than shoving the caption down when it arrives. */
                <div aria-busy='true' aria-label={`${label} loading`}>
                    <div className='mt-3 h-8 w-28 animate-pulse rounded bg-ink-600' />
                    <div className='mt-2.5 h-3 w-24 animate-pulse rounded bg-ink-600' />
                </div>
            ) : (
                <>
                    <div className='mt-3 flex items-end justify-between gap-3'>
                        <p className={`font-mono text-2xl font-bold leading-none sm:text-3xl ${valueClass}`}>
                            {value}
                        </p>

                        {/* The phone reference carries neither curve nor ring:
                            at two tiles to a row the figure needs the width
                            more than the shape does. */}
                        <div className='hidden shrink-0 sm:block'>
                            {rate !== undefined ? (
                                <Ring rate={rate} />
                            ) : (
                                hasCurve && (
                                    <Sparkline
                                        values={buckets as number[]}
                                        positive
                                        colorClass={fg}
                                        className='h-9 w-20'
                                    />
                                )
                            )}
                        </div>
                    </div>

                    <p className='mt-2 text-xs text-slate-500'>{caption}</p>
                </>
            )}
        </div>
    );
};

export default StatCard;
