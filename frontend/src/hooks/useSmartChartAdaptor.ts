import { useCallback, useEffect, useRef, useState } from 'react';
import { buildSmartchartsChampionAdapter } from '@/adapters/smartcharts-champion';
import { createServices } from '@/adapters/smartcharts-champion/services';
import { createTransport } from '@/adapters/smartcharts-champion/transport';
import type { ActiveSymbols, TradingTimesMap } from '@/types/smartchart.types';

/** Builds the SmartCharts adapter and loads chart reference data (symbols/times). */
export const useSmartChartAdaptor = () => {
    const adapterRef = useRef(buildSmartchartsChampionAdapter(createTransport(), createServices(), { debug: false }));
    const [chartData, setChartData] = useState<{ activeSymbols: ActiveSymbols; tradingTimes: TradingTimesMap }>({
        activeSymbols: [] as ActiveSymbols,
        tradingTimes: {} as TradingTimesMap,
    });

    useEffect(() => {
        let cancelled = false;
        let tries = 0;
        const load = async () => {
            try {
                const data = await adapterRef.current.getChartData();
                if (cancelled) return;
                if (data.activeSymbols.length === 0 && tries < 15) {
                    tries += 1;
                    setTimeout(load, 300);
                    return;
                }
                setChartData(data);
            } catch {
                if (!cancelled && tries < 15) {
                    tries += 1;
                    setTimeout(load, 300);
                }
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const getQuotes = useCallback((req: any) => adapterRef.current.getQuotes(req), []);
    const subscribeQuotes = useCallback((req: any, cb: any) => adapterRef.current.subscribeQuotes(req, cb), []);
    const unsubscribeQuotes = useCallback((req: any) => adapterRef.current.unsubscribeQuotes(req), []);

    return { chartData, getQuotes, subscribeQuotes, unsubscribeQuotes };
};
