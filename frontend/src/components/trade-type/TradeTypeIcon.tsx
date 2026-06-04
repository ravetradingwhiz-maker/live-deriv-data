import { lazy, Suspense, type ComponentType } from 'react';
import type { IconSize } from '@deriv/quill-icons';

/** Deriv contract-type icons (ported from quantumsyn) from @deriv/quill-icons/TradeTypes. */
const FallbackIcon = () => <span className='inline-block h-5 w-5 rounded bg-ink-600' />;

const T = (name: string) =>
    lazy(() =>
        import('@deriv/quill-icons/TradeTypes').then(m => ({
            default: ((m as any)[name] ?? FallbackIcon) as ComponentType<any>,
        }))
    );

const TRADE_TYPE_ICONS: Record<string, ReturnType<typeof T>> = {
    DIGITDIFF: T('TradeTypesDigitsDiffersIcon'),
    DIGITEVEN: T('TradeTypesDigitsEvenIcon'),
    DIGITMATCH: T('TradeTypesDigitsMatchesIcon'),
    DIGITODD: T('TradeTypesDigitsOddIcon'),
    DIGITOVER: T('TradeTypesDigitsOverIcon'),
    DIGITUNDER: T('TradeTypesDigitsUnderIcon'),
    CALL: T('TradeTypesUpsAndDownsRiseIcon'),
    CALLE: T('TradeTypesUpsAndDownsRiseIcon'),
    PUT: T('TradeTypesUpsAndDownsFallIcon'),
    PUTE: T('TradeTypesUpsAndDownsFallIcon'),
    HIGHER: T('TradeTypesHighsAndLowsHigherIcon'),
    LOWER: T('TradeTypesHighsAndLowsLowerIcon'),
    ONETOUCH: T('TradeTypesHighsAndLowsTouchIcon'),
    NOTOUCH: T('TradeTypesHighsAndLowsNoTouchIcon'),
    MULTUP: T('TradeTypesMultipliersUpIcon'),
    MULTDOWN: T('TradeTypesMultipliersDownIcon'),
    ACCU: T('TradeTypesAccumulatorStayInIcon'),
    unknown: lazy(() =>
        import('@deriv/quill-icons/Illustrative').then(m => ({
            default: ((m as any).IllustrativeMarketsIcon ?? FallbackIcon) as ComponentType<any>,
        }))
    ),
};

export const TradeTypeIcon = ({
    type,
    size = 'sm',
    className,
}: {
    type: string;
    size?: IconSize;
    className?: string;
}) => {
    const Icon = TRADE_TYPE_ICONS[type?.toUpperCase?.() as keyof typeof TRADE_TYPE_ICONS] || TRADE_TYPE_ICONS.unknown;
    return (
        <Suspense fallback={null}>
            <Icon iconSize={size} className={className} />
        </Suspense>
    );
};

export default TradeTypeIcon;
