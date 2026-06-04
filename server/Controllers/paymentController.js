const crypto = require('crypto');
const createError = require('http-errors');
const Payment = require('../Models/Payment');
const Subscription = require('../Models/Subscription');
const { createPaymentSchema } = require('../Middlewares/validation');
const { getTiers } = require('../config/tiers');
const tron = require('../Services/tronChainService');
const { sendSubscriptionReceipt } = require('../Services/emailService');

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

/** Background sweep so orders confirm even if the user closed the checkout tab. */
const pollPendingOrders = async () => {
    const since = new Date(Date.now() - ORDER_TTL_MS);
    const pending = await Payment.find({ status: 'pending', createdAt: { $gt: since } }).limit(50);
    for (const p of pending) await checkOnchain(p);
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

    // GET /api/payments/:orderId — frontend polls; checks the chain on the way.
    getOrder: async (req, res, next) => {
        try {
            const payment = await Payment.findOne({ orderId: req.params.orderId });
            if (!payment) throw createError.NotFound('Order not found');

            if (payment.status === 'pending') await checkOnchain(payment);

            res.json({
                orderId: payment.orderId,
                status: payment.status,
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
