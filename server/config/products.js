/**
 * Who each product says it is.
 *
 * One server sends receipts for three different brands. Until now every
 * email said "Nexora AI" whatever had been bought, so a QuantumSyn customer
 * — and now a NYX EA one — was thanked by name for a product they had never
 * heard of and told to log in somewhere they have no account.
 *
 * `accessLine` is the one sentence that says what the money bought, and it
 * differs by more than branding: Nexora and QuantumSyn unlock a site for
 * every Deriv login on the account, while NYX EA has no Deriv accounts at
 * all — its access is tied to the address the payment was made with.
 */

const BRANDS = {
    nexora: {
        name: 'Nexora AI',
        /* The gradient the heading is painted with, as it always was. */
        accent: 'linear-gradient(90deg,#fbbf24,#a855f7)',
        accessLine:
            'Premium is unlocked for all logins on your account — just log in and open Nexora AI Premium.',
    },
    quantumsyn: {
        name: 'QuantumSyn',
        accent: 'linear-gradient(90deg,#22d3ee,#6366f1)',
        accessLine:
            'Premium is unlocked for all logins on your account — just log in and open QuantumSyn.',
    },
    nyx: {
        name: 'NYX EA',
        /* Oxford blue and tan, which is what the app is built in. */
        accent: 'linear-gradient(90deg,#d2b48c,#e8d6b8)',
        accessLine: 'Your access is tied to this email address — sign in to NYX EA with it.',
    },
};

/** Falls back to Nexora, which is whose server this was to begin with. */
const brandFor = product => BRANDS[product] || BRANDS.nexora;

/**
 * The name to show on the download link, taken from the end of its own URL.
 *
 * Derived rather than written down so the link names the file by whatever it
 * is actually called — a bot renamed on the host would otherwise show a stale
 * name from an env var nobody remembered to change.
 */
const fileNameOf = url => {
    try {
        const last = new URL(url).pathname.split('/').filter(Boolean).pop();
        return last ? decodeURIComponent(last) : '';
    } catch {
        return '';
    }
};

/**
 * The bot a receipt links to, if there is one.
 *
 * Only NYX EA sells a file; Nexora and QuantumSyn sell access to a site and
 * have nothing to offer. The receipt carries a download link rather than an
 * attachment: Brevo refuses the .ex5/.mq5 formats EAs come in, and that
 * refusal fails the whole send, so an attached bot would mean a paid customer
 * got no receipt at all. A link carries any format and the file stays wherever
 * it is hosted.
 *
 * Null when it is not configured, and the receipt then goes out without the
 * link. A missing file is a customer who has to be sent the bot by hand; a
 * receipt that threw instead would be a customer who paid and heard nothing.
 */
const botFor = product => {
    if (product !== 'nyx') return null;

    const url = (process.env.NYX_EA_URL || '').trim();
    if (!url) return null;

    const name = (process.env.NYX_EA_FILENAME || '').trim() || fileNameOf(url);
    return name ? { url, name } : null;
};

module.exports = { BRANDS, brandFor, botFor, fileNameOf };
