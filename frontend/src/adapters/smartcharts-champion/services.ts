import { tradeWS } from '@/services/trade-ws';
import type { TServices } from './types';

/** Flatten a trading_times response into { symbol: { open:[], close:[] } }. */
const transformTradingTimes = (tt: any): Record<string, { open: string[]; close: string[] }> => {
    const out: Record<string, { open: string[]; close: string[] }> = {};
    tt?.markets?.forEach((m: any) =>
        m.submarkets?.forEach((sm: any) =>
            sm.symbols?.forEach((s: any) => {
                out[s.symbol] = {
                    open: s.times?.open ?? ['00:00:00'],
                    close: s.times?.close ?? ['23:59:59'],
                };
            })
        )
    );
    return out;
};

/** Services for the SmartCharts adapter, backed by our shared tradeWS. */
export function createServices(): TServices {
    return {
        async getActiveSymbols() {
            try {
                const res = await tradeWS.send({ active_symbols: 'brief' });
                return res.active_symbols ?? [];
            } catch {
                return [];
            }
        },
        async getTradingTimes() {
            try {
                const today = new Date().toISOString().slice(0, 10);
                // Don't block the chart if the socket doesn't answer trading_times
                // (the OAuth2 OTP socket may not) — race a 4s fallback.
                const res: any = await Promise.race([
                    tradeWS.send({ trading_times: today }),
                    new Promise(resolve => setTimeout(() => resolve({}), 4000)),
                ]);
                return transformTradingTimes(res?.trading_times);
            } catch {
                return {};
            }
        },
    };
}
