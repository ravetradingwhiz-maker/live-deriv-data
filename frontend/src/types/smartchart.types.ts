/**
 * Type definitions for @deriv-com/smartcharts-champion integration.
 */
import type { ActiveSymbol } from '@deriv-com/smartcharts-champion';

export type { ActiveSymbol } from '@deriv-com/smartcharts-champion';

export type ActiveSymbols = ActiveSymbol[];

export type TGranularity = 0 | 60 | 120 | 180 | 300 | 600 | 900 | 1800 | 3600 | 7200 | 14400 | 28800 | 86400;

export interface TQuote {
    Date: string;
    Close: number;
    Open?: number;
    High?: number;
    Low?: number;
    Volume?: number;
    tick?: any;
    ohlc?: any;
    DT?: Date;
    prevClose?: number;
}

export interface TGetQuotesRequest {
    symbol: string;
    granularity: TGranularity;
    start?: number;
    end?: number | 'latest';
    count?: number;
}

export interface TGetQuotesResult {
    quotes: TQuote[];
    meta?: {
        symbol: string;
        granularity: TGranularity;
        delay_amount?: number;
    };
}

export interface TradingTimesMap {
    [symbol: string]: {
        isOpen: boolean;
        openTime: string;
        closeTime: string;
    };
}

export type TSubscriptionCallback = (quote: TQuote) => void;
export type TUnsubscribeFunction = () => void;

export interface SmartchartsChampionFunctions {
    getQuotes: (request: TGetQuotesRequest) => Promise<TGetQuotesResult>;
    subscribeQuotes: (request: TGetQuotesRequest, callback: TSubscriptionCallback) => TUnsubscribeFunction;
    unsubscribeQuotes: (request: TGetQuotesRequest) => void;
    getChartData: () => Promise<{ activeSymbols: ActiveSymbol[]; tradingTimes: TradingTimesMap }>;
}

export interface TTransport {
    send: (request: any) => Promise<any>;
    subscribe: (request: any, callback: (response: any) => void) => string;
    unsubscribe: (subscription_id: string) => void;
    unsubscribeAll: (msg_type?: string) => void;
}

export interface TServices {
    getActiveSymbols: () => Promise<any>;
    getTradingTimes: () => Promise<any>;
}

export interface SmartchartsChampionAdapter extends SmartchartsChampionFunctions {
    transport: TTransport;
    services: TServices;
}

export interface AdapterConfig {
    debug?: boolean;
    subscriptionTimeout?: number;
    maxRetries?: number;
}
