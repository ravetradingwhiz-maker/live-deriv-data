/** Small display helpers for the positions panel. */

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

/**
 * A full date and time, for the detail lines a transaction expands into.
 *
 * Shown in the reader's own zone rather than the GMT Deriv quotes: the only
 * reason to read an entry time is to line it up against something else that
 * happened, and that something was on the clock on the wall.
 */
export const fmtDateTime = (epochSeconds?: number): string | undefined =>
    epochSeconds
        ? new Date(epochSeconds * 1000).toLocaleString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
          })
        : undefined;
