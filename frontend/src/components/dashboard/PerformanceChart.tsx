import { useId } from 'react';
import { BarChart3 } from 'lucide-react';

interface PerformanceChartProps {
    /** Per-day profit since the first of the month. */
    buckets: number[];
    /** The reward target, which sets the scale before there is anything to plot. */
    target: number;
    loading: boolean;
}

/** 1200 reads 1.2K; 4000 reads 4K. */
const axisLabel = (value: number): string => {
    if (Math.abs(value) < 1000) return String(Math.round(value));
    const thousands = value / 1000;
    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}K`;
};

/** The next round number at or above `value`, so the top gridline is a figure. */
const niceCeil = (value: number): number => {
    if (value <= 0) return 0;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    return Math.ceil(value / magnitude) * magnitude;
};

/**
 * The month's running profit, against the reward target.
 *
 * The line stops at today rather than running to the end of the month — the
 * axis covers the whole month because that is the period, but drawing beyond
 * the last settled trade would invent days that have not happened.
 *
 * Scaled to the target while the account is flat, so an empty chart still says
 * what the month is being measured against.
 */
const PerformanceChart = ({ buckets, target, loading }: PerformanceChartProps) => {
    const gradientId = useId();

    const now = new Date();
    const month = now.toLocaleString(undefined, { month: 'short' });
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    let running = 0;
    const cumulative = buckets.map(value => (running += value));

    const peak = cumulative.length ? Math.max(...cumulative) : 0;
    const floor = cumulative.length ? Math.min(0, ...cumulative) : 0;
    const top = niceCeil(Math.max(peak, target)) || target;
    const bottom = floor < 0 ? -niceCeil(Math.abs(floor)) : 0;
    const span = top - bottom || 1;

    const hasData = cumulative.length > 1 && buckets.some(value => value !== 0);
    const positive = (cumulative[cumulative.length - 1] ?? 0) >= 0;

    const ticks = [0, 1, 2, 3, 4].map(step => bottom + (span * step) / 4);

    const dayLabels = [1, 5, 10, 15, 20, 25, daysInMonth].filter(
        (day, index, all) => all.indexOf(day) === index && day <= daysInMonth
    );

    // x across the whole month, y from the running total.
    const x = (index: number) => (daysInMonth > 1 ? (index / (daysInMonth - 1)) * 100 : 0);
    const y = (value: number) => 100 - ((value - bottom) / span) * 100;

    const line = cumulative.map((value, index) => `${x(index).toFixed(2)},${y(value).toFixed(2)}`).join(' ');
    const area = cumulative.length
        ? `${x(0).toFixed(2)},${y(bottom).toFixed(2)} ${line} ${x(cumulative.length - 1).toFixed(2)},${y(bottom).toFixed(2)}`
        : '';

    const stroke = positive ? 'text-emerald-400' : 'text-rose-400';

    if (loading) {
        return <div className='h-64 w-full animate-pulse rounded-lg bg-ink-600/60' aria-busy='true' />;
    }

    return (
        <div className='relative h-64 w-full'>
            {/* Value axis. Sits in its own column so the plot starts clear of it. */}
            <div className='absolute bottom-6 left-0 top-0 w-9'>
                {ticks.map(tick => (
                    <span
                        key={tick}
                        className='absolute right-1 -translate-y-1/2 text-[10px] tabular-nums text-slate-500'
                        style={{ top: `${y(tick)}%` }}
                    >
                        {axisLabel(tick)}
                    </span>
                ))}
            </div>

            <div className='absolute bottom-6 left-9 right-0 top-0'>
                <div className='relative h-full border-b border-l border-line'>
                    {hasData && (
                        <svg
                            viewBox='0 0 100 100'
                            preserveAspectRatio='none'
                            aria-hidden
                            className={`h-full w-full ${stroke}`}
                        >
                            <defs>
                                <linearGradient id={gradientId} x1='0' y1='0' x2='0' y2='1'>
                                    <stop offset='0%' stopColor='currentColor' stopOpacity='0.28' />
                                    <stop offset='100%' stopColor='currentColor' stopOpacity='0' />
                                </linearGradient>
                            </defs>
                            <polygon points={area} fill={`url(#${gradientId})`} />
                            <polyline
                                points={line}
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                vectorEffect='non-scaling-stroke'
                            />
                        </svg>
                    )}

                    {!hasData && (
                        <div className='absolute inset-0 flex flex-col items-center justify-center text-center'>
                            <span className='flex h-16 w-16 items-center justify-center rounded-full bg-cyan-300/10'>
                                <BarChart3 size={26} className='text-cyan-300' />
                            </span>
                            <p className='mt-3 text-sm font-semibold text-white'>No data yet</p>
                            <p className='mt-1 max-w-[16rem] text-xs text-slate-500'>
                                Start trading to see your performance analytics here.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className='absolute bottom-0 left-9 right-0 flex h-6 items-center justify-between text-[10px] text-slate-500'>
                {dayLabels.map(day => (
                    <span key={day}>{`${month} ${day}`}</span>
                ))}
            </div>
        </div>
    );
};

export default PerformanceChart;
