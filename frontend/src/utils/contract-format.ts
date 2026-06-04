/** Small display helpers shared by the positions / history pages. */

const TYPE_LABEL: Record<string, string> = {
    CALL: 'Rise',
    PUT: 'Fall',
    CALLE: 'Rise',
    PUTE: 'Fall',
    HIGHER: 'Higher',
    LOWER: 'Lower',
    DIGITEVEN: 'Even',
    DIGITODD: 'Odd',
    DIGITOVER: 'Over',
    DIGITUNDER: 'Under',
    DIGITMATCH: 'Matches',
    DIGITDIFF: 'Differs',
    ONETOUCH: 'Touch',
    NOTOUCH: 'No Touch',
    EXPIRYMISS: 'Ends Outside',
    EXPIRYRANGE: 'Ends Between',
};

export const contractTypeLabel = (t?: string): string => (t && TYPE_LABEL[t]) || t || '—';

export const fmtSigned = (n: number): string => `${n >= 0 ? '+' : ''}${n.toFixed(2)}`;

export const fmtTime = (epochSeconds: number): string =>
    new Date(epochSeconds * 1000).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
