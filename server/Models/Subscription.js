const mongoose = require('mongoose');

/* Read from the one table that defines them, rather than restated here:
   a tier added to config/tiers.js and forgotten in this enum would be
   sellable and then refuse to save, after the money had been taken. */
const TIER_IDS = Object.keys(require('../config/tiers').TIERS);

// One row per purchase. `loginids` holds every Deriv login on the account
// (real + demo), so premium follows whichever account is active — a single
// document instead of one per loginid.
const SubscriptionSchema = new mongoose.Schema(
    {
        loginids: { type: [String], required: true, index: true },
        /* Lowercased, because for an email-keyed product this is the
           lookup key and not just a note: an order paid as A@B.com and a
           check for a@b.com must be the same customer. */
        email: { type: String, default: '', lowercase: true, trim: true, index: true },
        // Includes 'quantumsyn' — a different product on a different site. Which
        // site honours it is decided by the tier's `product`, in config/tiers.js.
        tier: { type: String, enum: TIER_IDS, required: true },
        startedAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true, index: true },
        status: { type: String, enum: ['active', 'expired'], default: 'active' },
        paymentId: { type: String, default: '' },
    },
    { timestamps: true }
);

SubscriptionSchema.index({ loginids: 1, expiresAt: -1 });

module.exports = mongoose.model('Subscription', SubscriptionSchema);
