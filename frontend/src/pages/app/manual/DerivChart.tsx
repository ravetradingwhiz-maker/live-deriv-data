import { memo } from 'react';
import {
    ChartMode,
    ChartTitle,
    setSmartChartsPublicPath,
    SmartChart,
    ToolbarWidget,
    type TGranularity,
} from '@deriv-com/smartcharts-champion';
import '@deriv-com/smartcharts-champion/dist/smartcharts.css';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useSmartChartAdaptor } from '@/hooks/useSmartChartAdaptor';
import { tradeWS } from '@/services/trade-ws';

// SmartCharts loads its (Flutter/CanvasKit) chart engine, sprites and locale
// chunks at runtime from this path — the dist assets are copied to public/.
setSmartChartsPublicPath('/js/smartcharts/');

interface DerivChartProps {
    symbol: string;
    onSymbolChange: (symbol: string) => void;
    granularity: number;
    onGranularityChange: (g: number) => void;
    chartType: string;
    onChartTypeChange: (t: string) => void;
    showLastDigitStats: boolean;
}

/**
 * Deriv SmartCharts chart. Minimal toolbar — only ChartMode (chart type +
 * interval). No indicators (StudyLegend), templates (Views), drawing tools
 * (DrawTools) or share. Markets picker is the built-in ChartTitle.
 */
const DerivChart = memo((props: DerivChartProps) => {
    const { symbol, onSymbolChange, granularity, onGranularityChange, chartType, onChartTypeChange, showLastDigitStats } =
        props;
    const isDesktop = useIsDesktop();
    const { chartData, getQuotes, subscribeQuotes, unsubscribeQuotes } = useSmartChartAdaptor();

    const getMarketsOrder = (active_symbols: any[]): string[] => {
        const synthetic = 'synthetic_index';
        if (!Array.isArray(active_symbols)) return [synthetic];
        const hasSynthetic = active_symbols.some(s => s.market === synthetic);
        return active_symbols
            .map(s => s.market)
            .reduce<string[]>((arr, market) => {
                if (market && arr.indexOf(market) === -1) arr.push(market);
                return arr;
            }, hasSynthetic ? [synthetic] : []);
    };

    const settings = {
        assetInformation: false,
        countdown: true,
        isHighestLowestMarkerEnabled: false,
        language: 'en',
        position: 'bottom',
        theme: 'dark',
    };

    if (!symbol || chartData.activeSymbols.length === 0) {
        return (
            <div className='flex h-full items-center justify-center text-sm text-slate-500'>Loading chart…</div>
        );
    }

    return (
        <div className='relative h-full w-full overflow-hidden' dir='ltr'>
            <SmartChart
                id={`ldd-${symbol}`}
                key={`chart-${symbol}`}
                barriers={[]}
                showLastDigitStats={showLastDigitStats}
                chartControlsWidgets={null}
                enabledChartFooter={false}
                chartType={chartType}
                isMobile={!isDesktop}
                enabledNavigationWidget={isDesktop}
                granularity={granularity as TGranularity}
                getQuotes={getQuotes}
                subscribeQuotes={subscribeQuotes}
                unsubscribeQuotes={unsubscribeQuotes}
                chartData={{ activeSymbols: chartData.activeSymbols, tradingTimes: chartData.tradingTimes }}
                settings={settings}
                symbol={symbol}
                topWidgets={() => <ChartTitle onChange={onSymbolChange} />}
                toolbarWidget={() => (
                    <ToolbarWidget position={isDesktop ? 'top' : 'bottom'}>
                        <ChartMode
                            portalNodeId='modal_root'
                            onChartType={onChartTypeChange}
                            onGranularity={onGranularityChange}
                        />
                    </ToolbarWidget>
                )}
                isConnectionOpened
                isLive
                leftMargin={80}
                getMarketsOrder={getMarketsOrder}
                feedCall={{ activeSymbols: false, tradingTimes: false }}
                requestAPI={(req: any) => tradeWS.send(req)}
                requestForget={() => {}}
                requestForgetStream={() => {}}
            />
        </div>
    );
});

DerivChart.displayName = 'DerivChart';

export default DerivChart;
