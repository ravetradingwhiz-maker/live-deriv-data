const axios = require('axios');
const crypto = require('crypto');

const BASE = 'https://api.nowpayments.io/v1';

const headers = () => ({ 'x-api-key': process.env.NOWPAYMENTS_API_KEY, 'Content-Type': 'application/json' });

// NOWPayments signs the IPN body as HMAC-SHA512 of the JSON with keys sorted
// alphabetically (recursively). We reproduce that to verify the webhook.
const sortObject = obj =>
    Object.keys(obj)
        .sort()
        .reduce((acc, key) => {
            const val = obj[key];
            acc[key] = val && typeof val === 'object' && !Array.isArray(val) ? sortObject(val) : val;
            return acc;
        }, {});

const createPayment = async ({ priceUSD, payCurrency, orderId, description, ipnCallbackUrl }) => {
    const { data } = await axios.post(
        `${BASE}/payment`,
        {
            price_amount: priceUSD,
            price_currency: 'usd',
            pay_currency: payCurrency,
            order_id: orderId,
            order_description: description,
            ipn_callback_url: ipnCallbackUrl,
        },
        { headers: headers() }
    );
    return data; // { payment_id, pay_address, pay_amount, pay_currency, payment_status, ... }
};

const getPaymentStatus = async paymentId => {
    const { data } = await axios.get(`${BASE}/payment/${paymentId}`, { headers: headers() });
    return data;
};

const verifyIpnSignature = (payload, signature) => {
    const secret = process.env.NOWPAYMENTS_IPN_SECRET;
    if (!secret || !signature) return false;
    const digest = crypto.createHmac('sha512', secret).update(JSON.stringify(sortObject(payload))).digest('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(String(signature)));
    } catch {
        return false;
    }
};

// NOWPayments lifecycle → our terminal states.
const PAID_STATUSES = ['finished'];
const FAILED_STATUSES = ['failed', 'refunded', 'expired'];

module.exports = { createPayment, getPaymentStatus, verifyIpnSignature, PAID_STATUSES, FAILED_STATUSES };
