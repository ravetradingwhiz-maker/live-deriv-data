import { useEffect, useRef, useState } from 'react';
import { subscribeTicks } from '@/services/trade-api';
import type { Subscription } from '@/services/trade-ws';

export interface TickPoint {
    time: number; // epoch seconds (monotonic)
    value: number;
}

export interface SymbolTicks {
    ticks: TickPoint[];
    digitCounts: number[]; // length 10
    digitPercents: number[]; // length 10
    lastDigit: number | null;
    currentQuote: number | null;
    decimals: number;
    ready: boolean;
}

const EMPTY: SymbolTicks = {
    ticks: [],
    digitCounts: Array(10).fill(0),
    digitPercents: Array(10).fill(0),
    lastDigit: null,
    currentQuote: null,
    decimals: 2,
    ready: false,
};

const lastDigitOf = (quote: number, decimals: number): number => {
    const s = quote.toFixed(decimals);
    return Number(s[s.length - 1]);
};

/**
 * Subscribes to a symbol's tick stream (last `count` ticks) and derives the
 * chart series plus the last-digit distribution used by Over/Under.
 */
export const useSymbolTicks = (symbol: string, count = 1000, reconnectKey?: string): SymbolTicks => {
    const [state, setState] = useState<SymbolTicks>(EMPTY);
    const quotesRef = useRef<number[]>([]);
    const timesRef = useRef<number[]>([]);
    const decimalsRef = useRef<number>(2);

    useEffect(() => {
        let sub: Subscription | null = null;
        let cancelled = false;
        quotesRef.current = [];
        timesRef.current = [];
        setState(EMPTY);

        const recompute = () => {
            const quotes = quotesRef.current;
            const times = timesRef.current;
            const decimals = decimalsRef.current;

            const counts = Array(10).fill(0);
            quotes.forEach(q => {
                counts[lastDigitOf(q, decimals)] += 1;
            });
            const total = quotes.length || 1;
            const percents = counts.map(c => (c / total) * 100);

            // Monotonically increasing time so lightweight-charts accepts it.
            const points: TickPoint[] = [];
            let t = 0;
            quotes.forEach((q, i) => {
                const raw = times[i] || i;
                const safe = raw <= t ? t + 1 : raw;
                t = safe;
                points.push({ time: safe, value: q });
            });

            const last = quotes.length ? quotes[quotes.length - 1] : null;
            setState({
                ticks: points,
                digitCounts: counts,
                digitPercents: percents,
                lastDigit: last !== null ? lastDigitOf(last, decimals) : null,
                currentQuote: last,
                decimals,
                ready: quotes.length > 0,
            });
        };

        subscribeTicks({
            symbol,
            style: 'ticks',
            count,
            onData: (msg: any) => {
                if (cancelled || msg.error) return;

                if (msg.msg_type === 'history' && msg.history) {
                    if (typeof msg.pip_size === 'number') decimalsRef.current = msg.pip_size;
                    quotesRef.current = (msg.history.prices ?? []).map(Number).slice(-count);
                    timesRef.current = (msg.history.times ?? []).map(Number).slice(-count);
                    recompute();
                } else if (msg.msg_type === 'tick' && msg.tick) {
                    quotesRef.current = [...quotesRef.current, Number(msg.tick.quote)].slice(-count);
                    timesRef.current = [...timesRef.current, Number(msg.tick.epoch)].slice(-count);
                    recompute();
                }
            },
        })
            .then(s => {
                if (cancelled) s.forget();
                else sub = s;
            })
            .catch(() => {});

        return () => {
            cancelled = true;
            sub?.forget();
        };
    }, [symbol, count, reconnectKey]);

    return state;
};
