/**
 * SmartCharts Champion Adapter — maps Deriv WS responses to the chart's data
 * functions. Ported from quantumsyn (backed here by our tradeWS transport).
 */
import type { ActiveSymbol } from '@deriv-com/smartcharts-champion';
import type {
    ActiveSymbols,
    AdapterConfig,
    SmartchartsChampionAdapter,
    TGetQuotesRequest,
    TGetQuotesResult,
    TGranularity,
    TQuote,
    TradingTimesMap,
    TServices,
    TSubscriptionCallback,
    TTransport,
    TUnsubscribeFunction,
} from './types';

const transformations = {
    toTGetQuotesResult(response: any, granularity: TGranularity): TGetQuotesResult {
        const quotes: TQuote[] = [];
        if (!response) return { quotes, meta: { symbol: '', granularity } };

        const { history, candles, prices, times } = response;
        const symbol = response.echo_req?.ticks_history || '';

        if (granularity === 0 && history) {
            const { prices: tp, times: tt } = history;
            if (tp && tt) {
                for (let i = 0; i < tp.length; i++) {
                    quotes.push({ Date: String(tt[i]), Close: tp[i], DT: new Date(tt[i] * 1000) });
                }
            }
        } else if (granularity > 0 && candles) {
            candles.forEach((c: any) => {
                quotes.push({
                    Date: String(c.epoch),
                    Open: c.open,
                    High: c.high,
                    Low: c.low,
                    Close: c.close,
                    DT: new Date(c.epoch * 1000),
                });
            });
        } else if (prices && times) {
            for (let i = 0; i < prices.length; i++) {
                quotes.push({ Date: String(times[i]), Close: prices[i], DT: new Date(times[i] * 1000) });
            }
        }

        return { quotes, meta: { symbol, granularity, delay_amount: response.pip_size || 0 } };
    },

    toActiveSymbols(data: any[]): ActiveSymbol[] {
        const symbols: ActiveSymbol[] = [];
        if (!Array.isArray(data)) return symbols;
        for (const s of data) {
            const code = s.underlying_symbol || s.symbol;
            if (!code || !s.market) continue;
            symbols.push({
                display_name: s.display_name || code,
                market: s.market,
                market_display_name: s.market_display_name || s.market,
                subgroup: s.subgroup || s.submarket || 'none',
                subgroup_display_name: s.subgroup_display_name || s.submarket_display_name || '',
                submarket: s.submarket || '',
                submarket_display_name: s.submarket_display_name || '',
                symbol: code,
                symbol_type: s.symbol_type || '',
                pip: s.pip || s.pip_size || 0.01,
                exchange_is_open: s.exchange_is_open ?? 1,
                is_trading_suspended: s.is_trading_suspended || 0,
                delay_amount: s.delay_amount || 0,
            } as ActiveSymbol);
        }
        return symbols;
    },

    toTradingTimesMap(data: any): TradingTimesMap {
        const out: TradingTimesMap = {};
        if (!data || typeof data !== 'object') return out;
        Object.keys(data).forEach(symbol => {
            const d = data[symbol];
            if (!d) return;
            if (d.open && d.close) {
                const open = Array.isArray(d.open) ? d.open : [d.open];
                const close = Array.isArray(d.close) ? d.close : [d.close];
                out[symbol] = { isOpen: open.length > 0 && open[0] !== '--', openTime: open[0] || '', closeTime: close[0] || '' };
            } else if ('isOpen' in d && 'openTime' in d && 'closeTime' in d) {
                out[symbol] = { isOpen: d.isOpen, openTime: d.openTime, closeTime: d.closeTime };
            }
        });
        return out;
    },
};

export function buildSmartchartsChampionAdapter(
    transport: TTransport,
    services: TServices,
    config: AdapterConfig = {}
): SmartchartsChampionAdapter {
    const subscriptions = new Map<string, () => void>();
    const debug = config.debug || false;
    const logger = {
        warn: debug ? console.warn.bind(console, '[SmartCharts]') : () => {},
        error: console.error.bind(console, '[SmartCharts]'),
    };

    return {
        transport,
        services,

        async getQuotes(request: TGetQuotesRequest): Promise<TGetQuotesResult> {
            try {
                const apiRequest: any = {
                    ticks_history: request.symbol,
                    end: request.end || 'latest',
                    count: request.count || 1000,
                    adjust_start_time: 1,
                };
                if (request.granularity === 0) apiRequest.style = 'ticks';
                else {
                    apiRequest.style = 'candles';
                    apiRequest.granularity = request.granularity;
                }
                if (request.start) {
                    apiRequest.start = request.start;
                    delete apiRequest.count;
                }
                const response = await transport.send(apiRequest);
                return transformations.toTGetQuotesResult(response, request.granularity);
            } catch (error) {
                logger.error('getQuotes', error);
                return { quotes: [], meta: { symbol: request.symbol, granularity: request.granularity } };
            }
        },

        subscribeQuotes(request: TGetQuotesRequest, callback: TSubscriptionCallback): TUnsubscribeFunction {
            const key = `${request.symbol}-${request.granularity}`;
            const apiRequest: any = { ticks_history: request.symbol, subscribe: 1, end: 'latest', count: 1 };
            if (request.granularity === 0) apiRequest.style = 'ticks';
            else {
                apiRequest.style = 'candles';
                apiRequest.granularity = request.granularity;
            }
            try {
                const id = transport.subscribe(apiRequest, (response: any) => {
                    try {
                        callback(response);
                    } catch (error) {
                        logger.error('stream', error);
                    }
                });
                const unsubscribe = () => {
                    transport.unsubscribe(id);
                    subscriptions.delete(key);
                };
                subscriptions.set(key, unsubscribe);
                return unsubscribe;
            } catch (error) {
                logger.error('subscribeQuotes', error);
                return () => {};
            }
        },

        unsubscribeQuotes(request: TGetQuotesRequest): void {
            const key = `${request.symbol}-${request.granularity}`;
            subscriptions.get(key)?.();
        },

        async getChartData(): Promise<{ activeSymbols: ActiveSymbols; tradingTimes: TradingTimesMap }> {
            try {
                const [activeSymbolsData, tradingTimesData] = await Promise.all([
                    services.getActiveSymbols(),
                    services.getTradingTimes(),
                ]);
                const activeSymbols = transformations.toActiveSymbols(activeSymbolsData);
                const realTimes = transformations.toTradingTimesMap(tradingTimesData);

                // Ensure EVERY symbol has a trading-times entry, otherwise SmartCharts
                // gets stuck on "Retrieving Trading Times…". Default to open 24/7
                // (correct for synthetics; good enough for others in this UI).
                const tradingTimes: TradingTimesMap = {};
                activeSymbols.forEach(s => {
                    tradingTimes[s.symbol] = realTimes[s.symbol] ?? {
                        isOpen: true,
                        openTime: '00:00:00',
                        closeTime: '23:59:59',
                    };
                });

                return { activeSymbols, tradingTimes };
            } catch (error) {
                logger.error('getChartData', error);
                return { activeSymbols: [] as ActiveSymbols, tradingTimes: {} as TradingTimesMap };
            }
        },
    };
}
