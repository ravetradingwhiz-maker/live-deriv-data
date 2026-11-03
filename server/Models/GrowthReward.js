const mongoose = require('mongoose');

/**
 * One row per account, tracking its position on the growth-reward ladder.
 *
 * `loginids` holds every Deriv login on the account, matching `Subscription`,
 * so the ladder follows the customer rather than whichever account they
 * happened to be looking at when they crossed the bar.
 *
 * `threshold` is the profit the account must reach for its next grant. It
 * doubles on each one, so the first 3 days cost +$500 and the next +$1,000.
 */
const GrowthRewardSchema = new mongoose.Schema(
    {
        loginids: { type: [String], required: true, index: true },
        /* When this account joined the challenge. Profit is counted from here,
           never from the account's whole history: the challenge asks them to
           trade to a target, and lifetime history would clear several rungs of
           the ladder before they had placed a single trade for it. */
        /* Deliberately no default. A default here is evaluated on every
           hydration of a document that lacks the field — rows written before
           this field existed do — so the baseline would read as "now" on each
           call and the window would slide forward every midnight, resetting
           the challenge nightly. Missing means missing; the controller falls
           back to createdAt and writes it back once. */
        startedAt: { type: Date },
        threshold: { type: Number, default: 500 },
        grantsClaimed: { type: Number, default: 0 },
        lastGrantedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model('GrowthReward', GrowthRewardSchema);
