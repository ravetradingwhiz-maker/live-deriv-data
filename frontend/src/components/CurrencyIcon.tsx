import { lazy, Suspense } from 'react';

/**
 * Deriv currency icons (ported from quantumsyn). Lazily loads the matching coin
 * icon from @deriv/quill-icons; falls back to a placeholder for unknown
 * currencies and uses the demo icon for virtual accounts.
 */
const CURRENCY_ICONS = {
    aud: lazy(() => import('@deriv/quill-icons/Currencies').then(m => ({ default: m.CurrencyAudIcon }))),
    bch: lazy(() => import('@deriv/quill-icons/Currencies').then(m => ({ default: m.CurrencyBchIcon }))),
    btc: lazy(() => import('@deriv/quill-icons/Currencies').then(m => ({ default: m.CurrencyBtcIcon }))),
    busd: lazy(() => import('@deriv/quill-icons/Currencies').then(m => ({ default: m.CurrencyBusdIcon }))),
    dai: lazy(() => import('@deriv/quill-icons/Currencies').then(m => ({ default: m.CurrencyDaiIcon }))),
    eth: lazy(() => import('@deriv/quill-icons/Currencies').then(m => ({ default: m.CurrencyEthIcon }))),
    eur: lazy(() => import('@deriv/quill-icons/Currencies').then(m => ({ default: m.CurrencyEurIcon }))),
    eurs: lazy(() => import('@deriv/quill-icons/Currencies').then(m => ({ default: m.CurrencyEursIcon }))),
    eusdt: lazy(() => import('@deriv/quill-icons/Currencies').then(m => ({ default: m.CurrencyUsdtIcon }))),
    gbp: lazy(() => import('@deriv/quill-icons/Currencies').then(m => ({ default: m.CurrencyGbpIcon }))),
    ltc: lazy(() => import('@deriv/quill-icons/Currencies').then(m => ({ default: m.CurrencyLtcIcon }))),
    tusdt: lazy(() => import('@deriv/quill-icons/Currencies').then(m => ({ default: m.CurrencyUsdtIcon }))),
    unknown: lazy(() => import('@deriv/quill-icons/Currencies').then(m => ({ default: m.CurrencyPlaceholderIcon }))),
    usd: lazy(() => import('@deriv/quill-icons/Currencies').then(m => ({ default: m.CurrencyUsdIcon }))),
    usdc: lazy(() => import('@deriv/quill-icons/Currencies').then(m => ({ default: m.CurrencyUsdcIcon }))),
    ust: lazy(() => import('@deriv/quill-icons/Currencies').then(m => ({ default: m.CurrencyUsdtIcon }))),
    virtual: lazy(() => import('@deriv/quill-icons/Currencies').then(m => ({ default: m.CurrencyDemoIcon }))),
    xrp: lazy(() => import('@deriv/quill-icons/Currencies').then(m => ({ default: m.CurrencyXrpIcon }))),
} as const;

type CurrencyIconProps = {
    currency?: string;
    isVirtual?: boolean;
    iconSize?: 'xs' | 'sm' | 'md' | 'lg';
};

export const CurrencyIcon = ({ currency, isVirtual, iconSize = 'sm' }: CurrencyIconProps) => {
    const Icon = isVirtual
        ? CURRENCY_ICONS.virtual
        : CURRENCY_ICONS[currency?.toLowerCase() as keyof typeof CURRENCY_ICONS] || CURRENCY_ICONS.unknown;

    return (
        <Suspense fallback={null}>
            <Icon iconSize={iconSize} />
        </Suspense>
    );
};

export default CurrencyIcon;
