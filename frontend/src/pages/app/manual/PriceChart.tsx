import { useEffect, useRef } from 'react';
import {
    AreaSeries,
    CandlestickSeries,
    ColorType,
    createChart,
    LineSeries,
    type IChartApi,
    type ISeriesApi,
    type Time,
} from 'lightweight-charts';
import { subscribeTicks } from '@/services/trade-api';
import type { Subscription } from '@/services/trade-ws';
import type { TickPoint } from '@/hooks/useSymbolTicks';

export type ChartType = 'area' | 'line' | 'candle';
export type Interval = 'tick' | '1m' | '5m' | '15m' | '1h' | '4h' | '1D';

const GRANULARITY: Record<Exclude<Interval, 'tick'>, number> = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
    '4h': 14400,
    '1D': 86400,
};

interface PriceChartProps {
    symbol: string;
    chartType: ChartType;
    interval: Interval;
    ticks: TickPoint[];
}

const chartOptions = (el: HTMLDivElement) => ({
    width: el.clientWidth,
    height: el.clientHeight,
    layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
        fontFamily: 'Poppins, system-ui, sans-serif',
    },
    grid: {
        vertLines: { color: 'rgba(23,56,66,0.6)' },
        horzLines: { color: 'rgba(23,56,66,0.6)' },
    },
    rightPriceScale: { borderColor: '#173842' },
    timeScale: { borderColor: '#173842', timeVisible: true, secondsVisible: true },
    crosshair: { horzLine: { color: '#0891b2' }, vertLine: { color: '#0891b2' } },
});

const PriceChart = ({ symbol, chartType, interval, ticks }: PriceChartProps) => {
    const elRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<any> | null>(null);

    const isCandleData = interval !== 'tick';
    const drawCandles = chartType === 'candle' && isCandleData;

    // Create the chart once.
    useEffect(() => {
        if (!elRef.current) return;
        const chart = createChart(elRef.current, chartOptions(elRef.current));
        chartRef.current = chart;
        const ro = new ResizeObserver(() => {
            if (elRef.current) chart.applyOptions({ width: elRef.current.clientWidth, height: elRef.current.clientHeight });
        });
        ro.observe(elRef.current);
        return () => {
            ro.disconnect();
            chart.remove();
            chartRef.current = null;
            seriesRef.current = null;
        };
    }, []);

    // (Re)build the series and wire its data source on type/interval/symbol change.
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;
        if (seriesRef.current) {
            chart.removeSeries(seriesRef.current);
            seriesRef.current = null;
        }

        if (drawCandles) {
            const s = chart.addSeries(CandlestickSeries, {
                upColor: '#10b981',
                downColor: '#ef4444',
                wickUpColor: '#10b981',
                wickDownColor: '#ef4444',
                borderVisible: false,
            });
            seriesRef.current = s;

            let sub: Subscription | null = null;
            let cancelled = false;
            subscribeTicks({
                symbol,
                style: 'candles',
                granularity: GRANULARITY[interval as Exclude<Interval, 'tick'>],
                count: 500,
                onData: (msg: any) => {
                    if (cancelled) return;
                    if (msg.msg_type === 'candles' && msg.candles) {
                        s.setData(
                            msg.candles.map((c: any) => ({
                                time: Number(c.epoch) as Time,
                                open: +c.open,
                                high: +c.high,
                                low: +c.low,
                                close: +c.close,
                            }))
                        );
                        chart.timeScale().fitContent();
                    } else if (msg.msg_type === 'ohlc' && msg.ohlc) {
                        const o = msg.ohlc;
                        s.update({
                            time: Number(o.open_time ?? o.epoch) as Time,
                            open: +o.open,
                            high: +o.high,
                            low: +o.low,
                            close: +o.close,
                        });
                    }
                },
            })
                .then(x => (cancelled ? x.forget() : (sub = x)))
                .catch(() => {});

            return () => {
                cancelled = true;
                sub?.forget();
            };
        }

        // Area / line series — fed from the `ticks` prop (see the effect below).
        const s =
            chartType === 'line'
                ? chart.addSeries(LineSeries, { color: '#22d3ee', lineWidth: 2 })
                : chart.addSeries(AreaSeries, {
                      lineColor: '#22d3ee',
                      topColor: 'rgba(34,211,238,0.28)',
                      bottomColor: 'rgba(34,211,238,0.02)',
                      lineWidth: 2,
                  });
        seriesRef.current = s;
    }, [symbol, chartType, interval, drawCandles]);

    // Feed tick data into the area/line series.
    useEffect(() => {
        if (drawCandles) return;
        const s = seriesRef.current;
        if (!s) return;
        s.setData(ticks.map(t => ({ time: t.time as Time, value: t.value })));
    }, [ticks, drawCandles]);

    return <div ref={elRef} className='h-full w-full' />;
};

export default PriceChart;
