import {
    TradeTypesDigitsDiffersIcon,
    TradeTypesDigitsEvenIcon,
    TradeTypesDigitsMatchesIcon,
    TradeTypesDigitsOddIcon,
    TradeTypesDigitsOverIcon,
    TradeTypesDigitsUnderIcon,
    TradeTypesHighsAndLowsHigherIcon,
    TradeTypesHighsAndLowsHighIcon,
    TradeTypesHighsAndLowsLowerIcon,
    TradeTypesHighsAndLowsLowIcon,
    TradeTypesHighsAndLowsNoTouchIcon,
    TradeTypesHighsAndLowsTouchIcon,
    TradeTypesInsAndOutsEndsInIcon,
    TradeTypesInsAndOutsEndsOutIcon,
    TradeTypesUpsAndDownsFallIcon,
    TradeTypesUpsAndDownsOnlyDownsIcon,
    TradeTypesUpsAndDownsOnlyUpsIcon,
    TradeTypesUpsAndDownsRiseIcon,
} from '@deriv/quill-icons/TradeTypes';
import { IllustrativeMarketsIcon } from '@deriv/quill-icons/Illustrative';

/**
 * The contract's trade type as Deriv's own mark, the way the bots' run panel
 * shows it — a Differs contract reads as the Differs glyph rather than the word.
 *
 * Imported directly rather than lazily: the bots load each icon through
 * `lazy()` because they pull from a package the bundler cannot see through,
 * which would mean a chunk per icon here for marks that are a few hundred bytes
 * each and all appear in the same list.
 */
const ICONS: Record<string, typeof TradeTypesDigitsEvenIcon> = {
    CALL: TradeTypesUpsAndDownsRiseIcon,
    CALLE: TradeTypesUpsAndDownsRiseIcon,
    PUT: TradeTypesUpsAndDownsFallIcon,
    PUTE: TradeTypesUpsAndDownsFallIcon,
    HIGHER: TradeTypesHighsAndLowsHigherIcon,
    LOWER: TradeTypesHighsAndLowsLowerIcon,
    DIGITEVEN: TradeTypesDigitsEvenIcon,
    DIGITODD: TradeTypesDigitsOddIcon,
    DIGITOVER: TradeTypesDigitsOverIcon,
    DIGITUNDER: TradeTypesDigitsUnderIcon,
    DIGITMATCH: TradeTypesDigitsMatchesIcon,
    DIGITDIFF: TradeTypesDigitsDiffersIcon,
    ONETOUCH: TradeTypesHighsAndLowsTouchIcon,
    NOTOUCH: TradeTypesHighsAndLowsNoTouchIcon,
    EXPIRYRANGE: TradeTypesInsAndOutsEndsInIcon,
    EXPIRYMISS: TradeTypesInsAndOutsEndsOutIcon,
    TICKHIGH: TradeTypesHighsAndLowsHighIcon,
    TICKLOW: TradeTypesHighsAndLowsLowIcon,
    RUNHIGH: TradeTypesUpsAndDownsOnlyUpsIcon,
    RUNLOW: TradeTypesUpsAndDownsOnlyDownsIcon,
};

/**
 * `title` rather than a tooltip component: the label is what the row used to
 * say in words, so it still has to be readable somewhere, and a native title is
 * the one place that costs nothing and works on every input.
 */
const TradeTypeIcon = ({ type, label, size = 20 }: { type?: string; label: string; size?: number }) => {
    const Icon = (type && ICONS[type.toUpperCase()]) || IllustrativeMarketsIcon;
    return (
        <span className='flex shrink-0 items-center' title={label}>
            <Icon width={size} height={size} />
        </span>
    );
};

export default TradeTypeIcon;
