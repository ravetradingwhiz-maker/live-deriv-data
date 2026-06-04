import { lazy, Suspense, type ComponentType } from 'react';
import type { IconSize } from '@deriv/quill-icons';

/**
 * Deriv market/symbol icons, ported from quantumsyn. Lazily loads the matching
 * icon from @deriv/quill-icons/Markets; falls back to a generic markets icon.
 */
const FallbackIcon = () => <span className='inline-block h-5 w-5 rounded-full bg-ink-600' />;

// Safe loader: if an icon export name doesn't exist in the installed
// @deriv/quill-icons version, fall back instead of crashing (a missing lazy
// default throws "Element type is invalid" and blanks the page).
const M = (name: string) =>
    lazy(() =>
        import('@deriv/quill-icons/Markets').then(m => ({
            default: ((m as any)[name] ?? FallbackIcon) as ComponentType<any>,
        }))
    );

const MARKET_ICONS: Record<string, ReturnType<typeof M>> = {
    // Forex
    FRXAUDCAD: M('MarketForexAudcadIcon'),
    FRXAUDCHF: M('MarketForexAudchfIcon'),
    FRXAUDJPY: M('MarketForexAudjpyIcon'),
    FRXAUDNZD: M('MarketForexAudnzdIcon'),
    FRXAUDUSD: M('MarketForexAudusdIcon'),
    FRXEURAUD: M('MarketForexEuraudIcon'),
    FRXEURCAD: M('MarketForexEurcadIcon'),
    FRXEURCHF: M('MarketForexEurchfIcon'),
    FRXEURGBP: M('MarketForexEurgbpIcon'),
    FRXEURJPY: M('MarketForexEurjpyIcon'),
    FRXEURNZD: M('MarketForexEurnzdIcon'),
    FRXEURUSD: M('MarketForexEurusdIcon'),
    FRXGBPAUD: M('MarketForexGbpaudIcon'),
    FRXGBPCAD: M('MarketForexGbpcadIcon'),
    FRXGBPCHF: M('MarketForexGbpchfIcon'),
    FRXGBPJPY: M('MarketForexGbpjpyIcon'),
    FRXGBPUSD: M('MarketForexGbpusdIcon'),
    FRXGBPNZD: M('MarketForexGbpnzdIcon'),
    FRXNZDJPY: M('MarketForexNzdjpnIcon'),
    FRXNZDUSD: M('MarketForexNzdusdIcon'),
    FRXUSDCAD: M('MarketForexUsdcadIcon'),
    FRXUSDCHF: M('MarketForexUsdchfIcon'),
    FRXUSDJPY: M('MarketForexUsdjpyIcon'),
    FRXUSDMXN: M('MarketForexUsdmxnIcon'),
    // Commodities
    FRXXAGUSD: M('MarketCommoditySilverusdIcon'),
    FRXXAUUSD: M('MarketCommodityGoldusdIcon'),
    FRXXPDUSD: M('MarketCommodityPalladiumusdIcon'),
    FRXXPTUSD: M('MarketCommodityPlatinumusdIcon'),
    // Stock indices
    OTC_AEX: M('MarketIndicesNetherlands25Icon'),
    OTC_AS51: M('MarketIndicesAustralia200Icon'),
    OTC_DJI: M('MarketIndicesWallStreet30Icon'),
    OTC_FCHI: M('MarketIndicesFrance40Icon'),
    OTC_FTSE: M('MarketIndicesUk100Icon'),
    OTC_GDAXI: M('MarketIndicesGermany40Icon'),
    OTC_HSI: M('MarketIndicesHongKong50Icon'),
    OTC_IBEX35: M('MarketIndicesSpain35Icon'),
    OTC_N225: M('MarketIndicesJapan225Icon'),
    OTC_NDX: M('MarketIndicesUsTech100Icon'),
    OTC_SPC: M('MarketIndicesUs500Icon'),
    OTC_SSMI: M('MarketIndicesSwiss20Icon'),
    OTC_SX5E: M('MarketIndicesEuro50Icon'),
    // Derived — Volatility
    R_10: M('MarketDerivedVolatility10Icon'),
    R_25: M('MarketDerivedVolatility25Icon'),
    R_50: M('MarketDerivedVolatility50Icon'),
    R_75: M('MarketDerivedVolatility75Icon'),
    R_100: M('MarketDerivedVolatility100Icon'),
    '1HZ10V': M('MarketDerivedVolatility101sIcon'),
    '1HZ15V': M('MarketDerivedVolatility151sIcon'),
    '1HZ25V': M('MarketDerivedVolatility251sIcon'),
    '1HZ30V': M('MarketDerivedVolatility301sIcon'),
    '1HZ50V': M('MarketDerivedVolatility501sIcon'),
    '1HZ75V': M('MarketDerivedVolatility751sIcon'),
    '1HZ90V': M('MarketDerivedVolatility901sIcon'),
    '1HZ100V': M('MarketDerivedVolatility1001sIcon'),
    '1HZ150V': M('MarketDerivedVolatility1501sIcon'),
    '1HZ200V': M('MarketDerivedVolatility2001sIcon'),
    '1HZ250V': M('MarketDerivedVolatility2501sIcon'),
    '1HZ300V': M('MarketDerivedVolatility3001sIcon'),
    // Derived — Boom / Crash
    BOOM300N: M('MarketDerivedBoom300Icon'),
    BOOM500: M('MarketDerivedBoom500Icon'),
    BOOM600: M('MarketDerivedBoom600Icon'),
    BOOM900: M('MarketDerivedBoom900Icon'),
    BOOM1000: M('MarketDerivedBoom1000Icon'),
    CRASH300N: M('MarketDerivedCrash300Icon'),
    CRASH500: M('MarketDerivedCrash500Icon'),
    CRASH600: M('MarketDerivedCrash600Icon'),
    CRASH900: M('MarketDerivedCrash900Icon'),
    CRASH1000: M('MarketDerivedCrash1000Icon'),
    // Derived — Jump / Step / Bull / Bear
    JD10: M('MarketDerivedJump10Icon'),
    JD25: M('MarketDerivedJump25Icon'),
    JD50: M('MarketDerivedJump50Icon'),
    JD75: M('MarketDerivedJump75Icon'),
    JD100: M('MarketDerivedJump100Icon'),
    JD150: M('MarketDerivedJump150Icon'),
    JD200: M('MarketDerivedJump200Icon'),
    STPRNG: M('MarketDerivedStepIndices100Icon'),
    STPRNG2: M('MarketDerivedStepIndices200Icon'),
    STPRNG3: M('MarketDerivedStepIndices300Icon'),
    STPRNG4: M('MarketDerivedStepIndices400Icon'),
    STPRNG5: M('MarketDerivedStepIndices500Icon'),
    RDBEAR: M('MarketDerivedBearIcon'),
    RDBULL: M('MarketDerivedBullIcon'),
    // Baskets
    WLDAUD: M('MarketDerivedAudBasketIcon'),
    WLDEUR: M('MarketDerivedEurBasketIcon'),
    WLDGBP: M('MarketDerivedGbpBasketIcon'),
    WLDXAU: M('MarketDerivedGoldBasketIcon'),
    WLDUSD: M('MarketDerivedUsdBasketIcon'),
    // Crypto
    CRYBTCUSD: M('MarketCryptocurrencyBtcusdIcon'),
    CRYETHUSD: M('MarketCryptocurrencyEthusdIcon'),
    CRYBCHUSD: M('MarketCryptocurrencyBchusdIcon'),
    CRYLTCUSD: M('MarketCryptocurrencyLtcusdIcon'),
    CRYEOSUSD: M('MarketCryptocurrencyEosusdIcon'),
    CRYXRPUSD: M('MarketCryptocurrencyXrpusdIcon'),
    unknown: lazy(() =>
        import('@deriv/quill-icons/Illustrative').then(m => ({
            default: ((m as any).IllustrativeMarketsIcon ?? FallbackIcon) as ComponentType<any>,
        }))
    ),
};

export const MarketIcon = ({ type, size = 'sm' }: { type: string; size?: IconSize }) => {
    const Icon = MARKET_ICONS[type?.toUpperCase?.() as keyof typeof MARKET_ICONS] || MARKET_ICONS.unknown;
    return (
        <Suspense fallback={<span className='inline-block h-6 w-6 rounded-full bg-ink-700' />}>
            <Icon iconSize={size} />
        </Suspense>
    );
};

export default MarketIcon;
