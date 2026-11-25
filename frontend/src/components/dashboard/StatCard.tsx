import Sparkline from '@/components/dashboard/Sparkline';

interface StatCardProps {
    label: string;
    /** Already formatted — the tile does not know whether it holds money. */
    value: string;
    caption: string;
    valueClass?: string;
    /** A curve, for a measure with a series behind it. */
    buckets?: number[];
    /**
     * Whether that curve is a gain. Only set it where up and down mean
     * something: a trade count rising is not good news, it is just a count.
     */
    curvePositive?: boolean;
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
                    className='stroke-cyan-400 transition-[stroke-dasharray] duration-500'
                />
            )}
        </svg>
    );
};

/**
 * One figure from the account, with what it measures beside it.
 *
 * No icon and no tint. Each tile used to carry a lucide glyph on a coloured
 * disc — emerald, violet, cyan, amber — and the colour said nothing: a trade
 * count was cyan and a win rate amber for no reason anyone could read off the
 * screen. Colour is kept for the one thing it can state plainly, which is
 * whether a figure is a gain or a loss.
 *
 * The tile is also quieter than the panels below it: no border, a lighter
 * fill, a smaller radius. Giving a figure and a titled section the same frame
 * flattens the hierarchy between them.
 */
const StatCard = ({
    label,
    value,
    caption,
    valueClass = 'text-white',
    buckets,
    curvePositive,
    rate,
    loading,
}: StatCardProps) => {
    const hasCurve = Boolean(buckets && buckets.length > 1);

    return (
        <div className='rounded-lg bg-ink-800/60 p-4 sm:p-5'>
            <p className='min-w-0 text-xs font-medium text-slate-400'>{label}</p>

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

                        {/* The phone layout carries neither curve nor ring: at
                            two tiles to a row the figure needs the width more
                            than the shape does. */}
                        <div className='hidden shrink-0 sm:block'>
                            {rate !== undefined ? (
                                <Ring rate={rate} />
                            ) : (
                                hasCurve && (
                                    <Sparkline
                                        values={buckets as number[]}
                                        positive={curvePositive ?? true}
                                        colorClass={
                                            curvePositive === undefined ? 'text-slate-500' : undefined
                                        }
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
