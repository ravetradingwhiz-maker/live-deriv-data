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
        threshold: { type: Number, default: 500 },
        grantsClaimed: { type: Number, default: 0 },
        lastGrantedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model('GrowthReward', GrowthRewardSchema);
