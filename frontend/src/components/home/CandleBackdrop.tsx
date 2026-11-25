/**
 * The candlestick field behind the hero's Nexora card.
 *
 * Decorative, so it is generated rather than streamed: opening a seventh
 * socket to draw something nobody reads would be a poor trade. The series is
 * seeded, so it is the same on every load and in every build — a random one
 * would occasionally produce a flat or absurd run, and nobody would see it
 * until a user did.
 *
 * It drifts very slowly, and not at all for anyone who asked for less motion.
 */

/** Deterministic 0..1 — a hash, not Math.random, so the field never changes. */
const rand = (n: number): number => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
};

const COUNT = 26;

interface Candle {
    x: number;
    open: number;
    close: number;
    high: number;
    low: number;
    up: boolean;
}

const candles: Candle[] = (() => {
    const out: Candle[] = [];
    let price = 50;
    for (let i = 0; i < COUNT; i++) {
        const drift = (rand(i) - 0.45) * 14;
        const open = price;
        const close = Math.max(8, Math.min(92, open + drift));
        const wick = 2 + rand(i + 100) * 7;
        out.push({
            x: i * 4,
            open,
            close,
            high: Math.max(open, close) + wick,
            low: Math.min(open, close) - wick,
            up: close >= open,
        });
        price = close;
    }
    return out;
})();

const CandleBackdrop = () => (
    <svg
        aria-hidden
        viewBox='0 0 104 100'
        preserveAspectRatio='none'
        className='candle-backdrop pointer-events-none absolute inset-0 h-full w-full'
    >
        {/* Fades out toward the card's centre so the content stays legible. */}
        <defs>
            <linearGradient id='candle-fade' x1='0' y1='0' x2='1' y2='0'>
                <stop offset='0%' stopColor='white' stopOpacity='0.55' />
                <stop offset='55%' stopColor='white' stopOpacity='0.08' />
                <stop offset='100%' stopColor='white' stopOpacity='0.4' />
            </linearGradient>
            <mask id='candle-mask'>
                <rect width='104' height='100' fill='url(#candle-fade)' />
            </mask>
        </defs>

        <g mask='url(#candle-mask)'>
            {candles.map(c => (
                <g key={c.x} className={c.up ? 'text-emerald-400' : 'text-rose-400'}>
                    <line
                        x1={c.x + 1.4}
                        x2={c.x + 1.4}
                        y1={100 - c.high}
                        y2={100 - c.low}
                        stroke='currentColor'
                        strokeWidth='0.35'
                    />
                    <rect
                        x={c.x}
                        y={100 - Math.max(c.open, c.close)}
                        width='2.8'
                        height={Math.max(1.2, Math.abs(c.close - c.open))}
                        fill='currentColor'
                    />
                </g>
            ))}
        </g>
    </svg>
);

export default CandleBackdrop;
