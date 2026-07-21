const crypto = require('crypto');
const createError = require('http-errors');
const Payment = require('../Models/Payment');
const Subscription = require('../Models/Subscription');
const { createPaymentSchema, paystackInitSchema } = require('../Middlewares/validation');
const { getTiers } = require('../config/tiers');
const tron = require('../Services/tronChainService');
const paystack = require('../Services/paystackService');
const fx = require('../Services/fxService');
const { sendSubscriptionReceipt } = require('../Services/emailService');

// Currency Paystack charges in (must be enabled on the account). Amount is sent
// in the currency's smallest unit, so priceUSD * 100 for USD.
const PAYSTACK_CURRENCY = (process.env.PAYSTACK_CURRENCY || 'USD').toUpperCase();

// How long an order stays payable (and reserves its unique amount).
const ORDER_TTL_MS = 60 * 60 * 1000; // 1 hour

const genOrderId = () => `NX-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
const round6 = n => Math.round(n * 1e6) / 1e6;

const addMonths = (date, months) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
};

/**
 * Picks a payable USDT amount that's unique among the currently-pending orders,
 * so an incoming transfer maps to exactly one order. Adds a sub-1 USDT tail.
 */
const uniqueAmount = async base => {
    const since = new Date(Date.now() - ORDER_TTL_MS);
    for (let i = 0; i < 50; i++) {
        const amount = round6(base + crypto.randomInt(1, 1000) / 1000); // base + 0.001..0.999
        const clash = await Payment.exists({ status: 'pending', payAmount: amount, createdAt: { $gt: since } });
        if (!clash) return amount;
    }
    // Extremely unlikely; fall back to a finer tail.
    return round6(base + crypto.randomInt(1, 1_000_000) / 1e6);
};

/**
 * Activates a paid order: writes a Subscription for every loginid and emails the
 * receipt. Idempotent — guarded by `payment.activated`.
 */
const activatePayment = async payment => {
    if (payment.activated) return;
    const tiers = await getTiers();
    const tierCfg = tiers[payment.tier];
    const expiresAt = addMonths(Date.now(), tierCfg.months);

    // One subscription holding all the account's loginids (real + demo).
    await Subscription.create({
        loginids: payment.loginids,
        email: payment.email,
        tier: payment.tier,
        startedAt: new Date(),
        expiresAt,
        status: 'active',
        paymentId: payment.orderId,
    });

    payment.status = 'paid';
    payment.activated = true;
    payment.paidAt = new Date();
    await payment.save();

    try {
        await sendSubscriptionReceipt({
            email: payment.email,
            tier: payment.tier,
            expiresAt,
            priceUSD: payment.priceUSD,
            payCurrency: payment.payCurrency,
            orderId: payment.orderId,
        });
    } catch (e) {
        console.error('[payment] receipt email failed:', e.message);
    }
};

/**
 * Looks for a confirmed on-chain USDT-TRC20 transfer that matches a pending
 * order's exact amount. Marks the order paid (→ activate) or expired.
 */
const checkOnchain = async payment => {
    if (payment.status !== 'pending') return;

    if (Date.now() - new Date(payment.createdAt).getTime() > ORDER_TTL_MS) {
        payment.status = 'expired';
        await payment.save();
        return;
    }

    let transfers = [];
    try {
        transfers = await tron.getIncomingUsdt(payment.payAddress, new Date(payment.createdAt).getTime());
    } catch (e) {
        console.error('[payment] TronGrid query failed:', e.message);
        return;
    }

    for (const t of transfers) {
        if (Math.abs(t.amount - payment.payAmount) > 0.0000005) continue;
        if (t.timestamp && t.timestamp < new Date(payment.createdAt).getTime() - 120000) continue;
        // Don't let one tx settle two orders.
        const used = await Payment.exists({ providerPaymentId: t.txid });
        if (used) continue;
        payment.providerPaymentId = t.txid;
        await activatePayment(payment);
        return;
    }
};

/**
 * Confirms a Paystack (card) order against Paystack's own record — the server
 * side of truth. Activates on success, marks failed on a terminal failure, and
 * leaves the order pending while the shopper is still on the checkout page.
 * Idempotent via `payment.activated`, so the webhook and the status poll can
 * both call it safely.
 */
const verifyPaystack = async payment => {
    if (payment.status !== 'pending') return;

    let data;
    try {
        data = await paystack.verifyTransaction(payment.orderId);
    } catch (e) {
        console.error('[payment] Paystack verify failed:', e.message);
        return;
    }

    if (data.status === 'success') {
        // Guard against a tampered client paying less than we charged. `payAmount`
        // is the amount in the charged currency's major unit (USD for card, KES
        // for M-Pesa); Paystack reports `data.amount` in the minor unit (×100).
        const expected = Math.round(payment.payAmount * 100);
        if (typeof data.amount === 'number' && data.amount < expected) {
            console.error(`[payment] Paystack underpayment on ${payment.orderId}: ${data.amount} < ${expected}`);
            payment.status = 'failed';
            await payment.save();
            return;
        }
        payment.providerPaymentId = String(data.id || data.reference || '');
        await activatePayment(payment);
    } else if (data.status === 'failed' || data.status === 'reversed') {
        payment.status = 'failed';
        await payment.save();
    }
    // 'abandoned' / 'ongoing' / 'pending' → leave as-is; the poll retries.
};

/** Background sweep so orders confirm even if the user closed the checkout tab. */
const pollPendingOrders = async () => {
    const since = new Date(Date.now() - ORDER_TTL_MS);
    const pending = await Payment.find({ status: 'pending', createdAt: { $gt: since } }).limit(50);
    for (const p of pending) {
        if (p.provider === 'paystack') await verifyPaystack(p);
        else await checkOnchain(p);
    }
};

module.exports = {
    pollPendingOrders,

    // GET /api/payments/pricing — public; current tier prices (incl. admin overrides).
    pricing: async (req, res, next) => {
        try {
            res.json({ tiers: await getTiers() });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/payments/create
    create: async (req, res, next) => {
        try {
            const { tier, email, loginids } = await createPaymentSchema.validateAsync(req.body);
            const address = process.env.TRON_WALLET_ADDRESS;
            if (!address) throw createError(500, 'Receiving wallet not configured');

            const tiers = await getTiers();
            const tierCfg = tiers[tier];
            const payAmount = await uniqueAmount(tierCfg.priceUSD);

            const payment = await Payment.create({
                orderId: genOrderId(),
                provider: 'tron',
                tier,
                priceUSD: tierCfg.priceUSD,
                payCurrency: 'usdttrc20',
                payAddress: address,
                payAmount,
                email,
                loginids,
                status: 'pending',
            });

            res.status(201).json({
                orderId: payment.orderId,
                tier: payment.tier,
                priceUSD: payment.priceUSD,
                payCurrency: payment.payCurrency,
                payAddress: payment.payAddress,
                payAmount: payment.payAmount,
                status: payment.status,
            });
        } catch (error) {
            if (error.isJoi) error.status = 422;
            next(error);
        }
    },

    // POST /api/payments/paystack/init — start a hosted card checkout.
    createCard: async (req, res, next) => {
        try {
            const { tier, email, loginids } = await paystackInitSchema.validateAsync(req.body);
            if (!process.env.PAYSTACK_SECRET_KEY) throw createError(500, 'Card payments not configured');

            const tiers = await getTiers();
            const tierCfg = tiers[tier];

            const payment = await Payment.create({
                orderId: genOrderId(),
                provider: 'paystack',
                tier,
                priceUSD: tierCfg.priceUSD,
                payCurrency: PAYSTACK_CURRENCY.toLowerCase(),
                payAddress: '',
                payAmount: tierCfg.priceUSD,
                email,
                loginids,
                status: 'pending',
            });

            // Paystack appends ?reference=<orderId>&trxref=<orderId> to this URL.
            const base = (process.env.CHECKOUT_RETURN_URL || process.env.ALLOWED_ORIGIN_1 || '').replace(/\/$/, '');
            const callbackUrl = base ? `${base}/app/checkout?tier=${tier}` : undefined;

            let init;
            try {
                init = await paystack.initTransaction({
                    email,
                    amountSubunit: Math.round(tierCfg.priceUSD * 100),
                    currency: PAYSTACK_CURRENCY,
                    reference: payment.orderId,
                    callbackUrl,
                    metadata: { orderId: payment.orderId, tier, loginids },
                });
            } catch (e) {
                payment.status = 'failed';
                await payment.save();
                throw createError(502, `Could not start card payment: ${e.message}`);
            }

            res.status(201).json({
                orderId: payment.orderId,
                authorizationUrl: init.authorization_url,
                status: payment.status,
            });
        } catch (error) {
            if (error.isJoi) error.status = 422;
            next(error);
        }
    },

    // POST /api/payments/mpesa/init — start an M-Pesa (Paystack mobile money)
    // checkout. M-Pesa settles only in KES, so the USD tier price is converted
    // at the live rate and the transaction is created in KES.
    createMpesa: async (req, res, next) => {
        try {
            const { tier, email, loginids } = await paystackInitSchema.validateAsync(req.body);
            if (!process.env.PAYSTACK_SECRET_KEY) throw createError(500, 'M-Pesa payments not configured');

            const tiers = await getTiers();
            const tierCfg = tiers[tier];

            const rate = await fx.getUsdToKes();
            const kesAmount = Math.round(tierCfg.priceUSD * rate); // whole shillings

            const payment = await Payment.create({
                orderId: genOrderId(),
                provider: 'paystack',
                tier,
                priceUSD: tierCfg.priceUSD,
                payCurrency: 'kes',
                payAddress: '',
                payAmount: kesAmount, // charged amount, in KES — used by the underpayment guard
                email,
                loginids,
                status: 'pending',
            });

            const base = (process.env.CHECKOUT_RETURN_URL || process.env.ALLOWED_ORIGIN_1 || '').replace(/\/$/, '');
            const callbackUrl = base ? `${base}/app/checkout?tier=${tier}` : undefined;

            let init;
            try {
                init = await paystack.initTransaction({
                    email,
                    amountSubunit: kesAmount * 100, // KES minor unit
                    currency: 'KES',
                    reference: payment.orderId,
                    callbackUrl,
                    channels: ['mobile_money'],
                    metadata: { orderId: payment.orderId, tier, loginids, method: 'mpesa', usdKesRate: rate },
                });
            } catch (e) {
                payment.status = 'failed';
                await payment.save();
                throw createError(502, `Could not start M-Pesa payment: ${e.message}`);
            }

            res.status(201).json({
                orderId: payment.orderId,
                authorizationUrl: init.authorization_url,
                status: payment.status,
                currency: 'KES',
                amount: kesAmount,
            });
        } catch (error) {
            if (error.isJoi) error.status = 422;
            next(error);
        }
    },

    // POST /api/payments/paystack/webhook — Paystack calls this on charge events.
    // Signature is verified over the raw body captured in index.js (req.rawBody).
    webhook: async (req, res) => {
        const signature = req.headers['x-paystack-signature'];
        if (!paystack.verifyWebhookSignature(req.rawBody, signature)) {
            return res.status(401).json({ received: false });
        }
        try {
            const event = req.body;
            if (event && event.event === 'charge.success') {
                const reference = event.data && event.data.reference;
                const payment = reference ? await Payment.findOne({ orderId: reference }) : null;
                if (payment && payment.status === 'pending') {
                    // Re-verify against the API rather than trusting the payload.
                    await verifyPaystack(payment);
                }
            }
        } catch (e) {
            console.error('[payment] Paystack webhook error:', e.message);
        }
        // Always 200 on a valid signature so Paystack stops retrying.
        res.json({ received: true });
    },

    // GET /api/payments/:orderId — frontend polls; confirms with the provider on the way.
    getOrder: async (req, res, next) => {
        try {
            const payment = await Payment.findOne({ orderId: req.params.orderId });
            if (!payment) throw createError.NotFound('Order not found');

            if (payment.status === 'pending') {
                if (payment.provider === 'paystack') await verifyPaystack(payment);
                else await checkOnchain(payment);
            }

            res.json({
                orderId: payment.orderId,
                status: payment.status,
                provider: payment.provider,
                tier: payment.tier,
                priceUSD: payment.priceUSD,
                payCurrency: payment.payCurrency,
                payAddress: payment.payAddress,
                payAmount: payment.payAmount,
            });
        } catch (error) {
            next(error);
        }
    },
};
