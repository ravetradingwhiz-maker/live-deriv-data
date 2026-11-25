import { useSymbolTicks } from '@/hooks/useSymbolTicks';
import Sparkline from '@/components/dashboard/Sparkline';

/**
 * The markets grid, driven by the live feed.
 *
 * This replaced a static list carrying invented percentage changes — numbers
 * that looked like market data and were not. The figures and the curves here
 * are both computed from the same stream of ticks, so the card cannot say one
 * thing while the line shows another.
 *
 * All six are synthetic indices: they trade around the clock, so the grid is
 * never a wall of flat weekend lines the way forex or metals would be.
 */
const SYMBOLS: { symbol: string; name: string; tag: string }[] = [
    { symbol: 'R_75', name: 'Volatility 75 Index', tag: 'Synthetic' },
    { symbol: 'R_100', name: 'Volatility 100 Index', tag: 'Synthetic' },
    { symbol: 'BOOM1000', name: 'Boom 1000 Index', tag: 'Synthetic' },
    { symbol: 'CRASH500', name: 'Crash 500 Index', tag: 'Synthetic' },
    { symbol: 'R_50', name: 'Volatility 50 Index', tag: 'Synthetic' },
    { symbol: 'R_25', name: 'Volatility 25 Index', tag: 'Synthetic' },
];

/** Enough for a readable curve; the hook defaults to 1000, which this has no use for. */
const TICK_COUNT = 60;

const MarketCard = ({ symbol, name, tag }: { symbol: string; name: string; tag: string }) => {
    const { ticks, ready } = useSymbolTicks(symbol, TICK_COUNT);

    const values = ticks.map(t => t.value);
    const first = values[0] ?? 0;
    const last = values[values.length - 1] ?? 0;
    const change = first ? ((last - first) / first) * 100 : 0;
    const up = change >= 0;

    /* Sparkline plots the running total of what it is given, so it is fed the
       tick-to-tick differences — their cumulative sum is the price path. */
    const deltas = values.slice(1).map((v, i) => v - values[i]);

    return (
        <div className='rounded-xl border border-line bg-ink-900 p-4 transition-colors hover:border-cyan-800'>
            <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                    <p className='truncate text-sm font-semibold text-white'>{name}</p>
                    <span className='mt-1.5 inline-block rounded bg-ink-700 px-2 py-0.5 text-[11px] text-slate-400'>
                        {tag}
                    </span>
                </div>
                <span
                    className={`shrink-0 font-mono text-sm tabular-nums ${
                        ready ? (up ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-600'
                    }`}
                >
                    {ready ? `${up ? '+' : ''}${change.toFixed(2)}%` : '—'}
                </span>
            </div>

            <div className='mt-4'>
                <Sparkline
                    values={deltas}
                    positive={up}
                    colorClass={up ? 'text-emerald-400' : 'text-rose-400'}
                    className='h-12 w-full'
                />
            </div>
        </div>
    );
};

const LiveMarkets = () => (
    <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
        {SYMBOLS.map(m => (
            <MarketCard key={m.symbol} {...m} />
        ))}
    </div>
);

export default LiveMarkets;
