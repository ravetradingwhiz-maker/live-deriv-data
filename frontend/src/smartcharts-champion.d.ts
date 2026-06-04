/** Minimal ambient types for @deriv-com/smartcharts-champion (ships no .d.ts). */
declare module '@deriv-com/smartcharts-champion' {
    import type { ComponentType } from 'react';

    export type ActiveSymbol = {
        display_name: string;
        market: string;
        market_display_name: string;
        subgroup?: string;
        subgroup_display_name?: string;
        submarket: string;
        submarket_display_name: string;
        symbol: string;
        symbol_type?: string;
        pip: number;
        exchange_is_open: number;
        is_trading_suspended?: number;
        delay_amount?: number;
        [key: string]: any;
    };
    export type ActiveSymbols = ActiveSymbol[];
    export type TradingTimesMap = Record<string, any>;
    export type TGranularity = number;
    export type TGetQuotes = any;
    export type TSubscribeQuotes = any;
    export type TUnsubscribeQuotes = any;
    export type TStateChangeListener = (state: string, options?: any) => void;

    export function setSmartChartsPublicPath(path: string): void;
    export const SmartChart: ComponentType<any>;
    export const ChartTitle: ComponentType<any>;
    export const ChartMode: ComponentType<any>;
    export const ToolbarWidget: ComponentType<any>;
    export const StudyLegend: ComponentType<any>;
    export const DrawTools: ComponentType<any>;
    export const Views: ComponentType<any>;
    export const Share: ComponentType<any>;
}

declare module '@deriv-com/smartcharts-champion/dist/smartcharts.css';
