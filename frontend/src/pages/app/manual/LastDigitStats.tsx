interface LastDigitStatsProps {
    percents: number[]; // length 10
    lastDigit: number | null;
    barrier: number;
    totalTicks: number;
}

/**
 * Last-digit distribution for the last N ticks. The barrier digit is outlined in
 * cyan; the current last digit is highlighted in red (as on the reference UI).
 */
const LastDigitStats = ({ percents, lastDigit, barrier, totalTicks }: LastDigitStatsProps) => {
    const max = Math.max(...percents, 1);

    return (
        <div className='rounded-xl border border-line bg-ink-900/85 p-2.5 shadow-xl shadow-black/40 backdrop-blur'>
            <div className='mb-1.5 flex items-center justify-between'>
                <span className='text-[10px] font-semibold uppercase tracking-wider text-slate-400'>
                    Last digit stats
                </span>
                <span className='text-[10px] text-slate-500'>({totalTicks} ticks)</span>
            </div>
            <div className='flex items-end justify-between gap-1'>
                {percents.map((p, digit) => {
                    const isLast = digit === lastDigit;
                    const isBarrier = digit === barrier;
                    const isMax = p === max && p > 0;
                    return (
                        <div key={digit} className='flex flex-1 flex-col items-center gap-1'>
                            <span
                                className={`font-mono text-[10px] ${
                                    isLast ? 'text-rose-400' : isMax ? 'text-cyan-300' : 'text-slate-500'
                                }`}
                            >
                                {p.toFixed(1)}%
                            </span>
                            <div className='flex h-12 w-full items-end justify-center'>
                                <div
                                    className={`w-full rounded-t ${isLast ? 'bg-rose-500' : 'bg-cyan-700'}`}
                                    style={{ height: `${(p / max) * 100}%`, minHeight: p > 0 ? '4px' : '0' }}
                                />
                            </div>
                            <span
                                className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                                    isLast
                                        ? 'bg-rose-500 text-white'
                                        : isBarrier
                                          ? 'border border-cyan-400 text-cyan-300'
                                          : 'text-slate-300'
                                }`}
                            >
                                {digit}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LastDigitStats;
