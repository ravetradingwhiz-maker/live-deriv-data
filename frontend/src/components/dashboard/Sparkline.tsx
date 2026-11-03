interface SparklineProps {
    /** Per-day profit. Plotted as a running total, so the line is the curve. */
    values: number[];
    positive: boolean;
}

/**
 * A bare profit curve — no axes, no grid, no library.
 *
 * Drawn from the running total rather than the daily figures: a reader of a
 * growth card wants to see where the account got to, not a row of spikes.
 */
const Sparkline = ({ values, positive }: SparklineProps) => {
    if (values.length < 2) return null;

    let total = 0;
    const cumulative = values.map(v => (total += v));

    const min = Math.min(0, ...cumulative);
    const max = Math.max(0, ...cumulative);
    // A flat line would divide by zero; park it mid-height instead.
    const span = max - min || 1;

    const points = cumulative
        .map((v, i) => {
            const x = (i / (cumulative.length - 1)) * 100;
            const y = 100 - ((v - min) / span) * 100;
            return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ');

    return (
        <svg
            viewBox='0 0 100 100'
            preserveAspectRatio='none'
            aria-hidden
            className={`h-10 w-full ${positive ? 'text-emerald-400' : 'text-rose-400'}`}
        >
            <polyline
                points={points}
                fill='none'
                stroke='currentColor'
                strokeWidth='2.5'
                strokeLinecap='round'
                strokeLinejoin='round'
                vectorEffect='non-scaling-stroke'
            />
        </svg>
    );
};

export default Sparkline;
