const mongoose = require('mongoose');

/* Read from the one table that defines them, rather than restated here:
   a tier added to config/tiers.js and forgotten in this enum would be
   sellable and then refuse to save, after the money had been taken. */
const TIER_IDS = Object.keys(require('../config/tiers').TIERS);

const PaymentSchema = new mongoose.Schema(
    {
        orderId: { type: String, required: true, unique: true, index: true },
        provider: { type: String, default: 'nowpayments' },
        providerPaymentId: { type: String, index: true },
        // The receipt the customer sees on their own side — an M-Pesa code for
        // PayHero orders. What they quote when they ask about a payment.
        providerReceipt: { type: String, default: '' },
        tier: { type: String, enum: TIER_IDS, required: true },
        priceUSD: { type: Number, required: true },
        payCurrency: { type: String, required: true }, // e.g. btc, eth, usdttrc20
        payAddress: { type: String, default: '' },
        payAmount: { type: Number, default: 0 },
        email: { type: String, required: true },
        loginids: { type: [String], default: [] },
        status: {
            type: String,
            enum: ['pending', 'paid', 'expired', 'failed'],
            default: 'pending',
            index: true,
        },
        // Guards against activating / emailing twice (webhook + status poll).
        activated: { type: Boolean, default: false },
        paidAt: { type: Date, default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Payment', PaymentSchema);
