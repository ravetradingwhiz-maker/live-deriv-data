// PayHero integration for M-Pesa. Mirrors how paystackService wraps the card
// side: this file only talks to PayHero; activation and subscription logic stay
// in the payment controller.
//
// Docs: https://docs.payhero.co.ke
//
// One thing to know before reading further: **PayHero's callback is not
// signed.** Paystack sends an HMAC-SHA512 of the raw body; PayHero sends a bare
// JSON object with a `Status` field in it. Anyone who learns the callback URL
// can post `"Status": "Success"` and, if the callback were believed, be handed a
// paid subscription. So the callback is only ever a nudge to go and look —
// `getTransactionStatus` below is the only thing allowed to settle an order.
const axios = require('axios');

const PAYHERO_BASE = 'https://backend.payhero.co.ke';

/**
 * The Authorization header value.
 *
 * PayHero's dashboard hands you a ready-made Basic token under API Keys, which
 * is what PAYHERO_AUTH_TOKEN holds. The username/password pair is accepted as
 * well because that is what their own samples build the token from, and it
 * saves anyone re-deriving it by hand.
 */
const authHeader = () => {
    const token = process.env.PAYHERO_AUTH_TOKEN;
    if (token) return token.startsWith('Basic ') ? token : `Basic ${token}`;

    const user = process.env.PAYHERO_API_USERNAME;
    const pass = process.env.PAYHERO_API_PASSWORD;
    if (user && pass) return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;

    throw new Error('PAYHERO_AUTH_TOKEN (or PAYHERO_API_USERNAME + PAYHERO_API_PASSWORD) not configured');
};

const client = () =>
    axios.create({
        baseURL: PAYHERO_BASE,
        headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
        timeout: 20000,
    });

/**
 * Kenyan mobile number in the `07xxxxxxxx` shape PayHero's own examples use.
 *
 * People type their number every which way — with the country code, with a
 * plus, with spaces, without the leading zero — and an STK push sent to a
 * malformed number just silently never arrives. Worth normalising here rather
 * than discovering it in support.
 */
const normalisePhone = raw => {
    let digits = String(raw || '').replace(/\D/g, '');

    // Strip whichever prefix it was written with, down to the subscriber number.
    if (digits.startsWith('00254')) digits = digits.slice(5);
    else if (digits.startsWith('254')) digits = digits.slice(3);
    else if (digits.startsWith('0')) digits = digits.slice(1);

    /* One check on what is left rather than one per prefix, so every spelling of
       a number is held to the same standard: nine digits opening on 7 or 1,
       which is every Kenyan mobile range. Checking per branch let 254812345678
       through as 0812345678, which is not a mobile number at all. */
    if (!/^[17]\d{8}$/.test(digits)) throw new Error('Enter a valid Safaricom number, e.g. 0712345678');

    return `0${digits}`;
};

/**
 * Pushes an STK prompt to the customer's phone.
 *
 * `amount` is whole shillings — PayHero types it as an integer, and sending a
 * fraction is rejected rather than rounded.
 *
 * Returns { success, status: 'QUEUED', reference, CheckoutRequestID }. The
 * `reference` is PayHero's own id and the only thing `getTransactionStatus`
 * accepts, so it has to be stored against the order.
 */
const initiateStkPush = async ({ amount, phone, reference, customerName, callbackUrl }) => {
    const channelId = Number(process.env.PAYHERO_CHANNEL_ID);
    if (!Number.isInteger(channelId)) throw new Error('PAYHERO_CHANNEL_ID not configured');

    const { data } = await client().post('/api/v2/payments', {
        amount: Math.round(Number(amount)),
        phone_number: normalisePhone(phone),
        channel_id: channelId,
        provider: 'm-pesa',
        external_reference: reference,
        ...(customerName ? { customer_name: customerName } : {}),
        ...(callbackUrl ? { callback_url: callbackUrl } : {}),
    });

    if (!data || data.success === false) {
        throw new Error((data && (data.error_message || data.message)) || 'PayHero STK push failed');
    }
    return data;
};

/**
 * Server-side truth for an order.
 *
 * Takes the reference PayHero returned at init (it also accepts the M-Pesa
 * code). Status is one of QUEUED — pushed but no callback yet — SUCCESS, or
 * FAILED.
 */
const getTransactionStatus = async reference => {
    const { data } = await client().get('/api/v2/transaction-status', { params: { reference } });
    if (!data) throw new Error('PayHero status check returned nothing');
    return data;
};

module.exports = { initiateStkPush, getTransactionStatus, normalisePhone };
