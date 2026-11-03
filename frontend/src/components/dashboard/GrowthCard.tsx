import Sparkline from '@/components/dashboard/Sparkline';

interface GrowthCardProps {
    title: string;
    profit: number;
    percent: number | null;
    trades: number;
    winRate: number | null;
    /** Omitted on a single-day card, which has nothing to plot. */
    buckets?: number[];
    currency: string;
    loading: boolean;
}

const EM_DASH = '—';

const fmtMoney = (value: number, currency: string): string => {
    const sign = value >= 0 ? '+' : '-';
    const body = Math.abs(value).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return `${sign}${body} ${currency}`.trim();
};

const fmtPercent = (value: number | null): string =>
    value === null ? EM_DASH : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;

/** One period's realised growth: the figure, the percentage, and the trades behind it. */
const GrowthCard = ({ title, profit, percent, trades, winRate, buckets, currency, loading }: GrowthCardProps) => {
    const positive = profit >= 0;

    return (
        <div className='rounded-xl border border-line bg-ink-800 p-3 sm:p-4'>
            <p className='text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs'>{title}</p>

            {loading ? (
                /* Shaped like the loaded card — same rows, same heights — so the
                   figures land in place instead of the card jumping. */
                <div aria-busy='true' aria-label={`${title} loading`}>
                    <div className='mt-1.5 flex items-baseline justify-between gap-x-3'>
                        <span className='block h-5 w-24 animate-pulse rounded bg-ink-600 sm:h-8 sm:w-32' />
                        <span className='block h-3.5 w-9 animate-pulse rounded bg-ink-600 sm:h-4 sm:w-12' />
                    </div>
                    {buckets && <div className='mt-2 h-10 w-full animate-pulse rounded bg-ink-600' />}
                    <div className='mt-2 h-3 w-28 animate-pulse rounded bg-ink-600 sm:h-3.5' />
                </div>
            ) : (
                <>
                    <div className='mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3'>
                        <span
                            className={`font-mono text-base font-bold sm:text-2xl ${
                                positive ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                        >
                            {fmtMoney(profit, currency)}
                        </span>
                        <span className={`font-mono text-xs sm:text-sm ${positive ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                            {fmtPercent(percent)}
                        </span>
                    </div>

                    {buckets && <div className='mt-2'><Sparkline values={buckets} positive={positive} /></div>}

                    <p className='mt-2 text-[11px] text-slate-400 sm:text-xs'>
                        {trades} {trades === 1 ? 'trade' : 'trades'}
                        <span className='mx-1.5 text-slate-600'>·</span>
                        {winRate === null ? EM_DASH : `${Math.round(winRate * 100)}% win rate`}
                    </p>
                </>
            )}
        </div>
    );
};

export default GrowthCard;
