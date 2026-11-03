const createError = require('http-errors');
const GrowthReward = require('../Models/GrowthReward');
const Subscription = require('../Models/Subscription');
const { growthRewardSchema } = require('../Middlewares/validation');
const { fetchAllTimeProfit } = require('../Services/growthProfit');

/** What a grant is worth. */
const REWARD_TIER = 'alpha';
const REWARD_DAYS = 3;

/** Each grant doubles the bar: 500, then 1000, then 2000. */
const nextThreshold = current => current * 2;

/** Whether realised profit has reached the account's current target. */
const shouldGrant = (profit, threshold) => profit >= threshold;

const daysFromNow = days => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

module.exports = {
    nextThreshold,
    shouldGrant,

    /**
     * POST /api/rewards/growth/check
     *
     * Reads the account's realised profit from Deriv — the server's own read,
     * never a figure the client supplied — and grants 3 days of Alpha if it has
     * reached the current target, moving the target up afterwards.
     */
    check: async (req, res, next) => {
        try {
            const { value, error } = growthRewardSchema.validate(req.body || {});
            if (error) throw createError(400, error.message);

            const { loginids, accessToken } = value;

            // The active account is the one the figure is read from; the row is
            // keyed on every login so the ladder survives an account switch.
            let profit;
            try {
                profit = await fetchAllTimeProfit(accessToken, loginids[0]);
            } catch (e) {
                // A rejected token is the caller's problem, not a server fault —
                // and it must never result in a grant on unverified profit.
                throw createError(e.status || 502, e.message || 'Could not read your profit from Deriv');
            }

            let ladder = await GrowthReward.findOne({ loginids: { $in: loginids } });
            if (!ladder) ladder = await GrowthReward.create({ loginids });

            const threshold = ladder.threshold;
            let granted = false;
            let expiresAt = null;

            if (shouldGrant(profit, threshold)) {
                /* Bump the ladder first, conditional on the threshold still
                   being the one just read. Two requests racing means only one
                   matches a document, so only one goes on to write a
                   subscription — a double-submit cannot buy two grants. */
                const bumped = await GrowthReward.findOneAndUpdate(
                    { _id: ladder._id, threshold },
                    {
                        $set: { threshold: nextThreshold(threshold), lastGrantedAt: new Date() },
                        $inc: { grantsClaimed: 1 },
                    },
                    { new: true }
                );

                if (bumped) {
                    expiresAt = daysFromNow(REWARD_DAYS);
                    await Subscription.create({
                        loginids,
                        tier: REWARD_TIER,
                        expiresAt,
                        status: 'active',
                        paymentId: `reward:growth:${bumped.grantsClaimed}`,
                    });
                    granted = true;
                    ladder = bumped;
                }
            }

            res.json({
                profit,
                threshold: ladder.threshold,
                grantsClaimed: ladder.grantsClaimed,
                granted,
                expiresAt,
            });
        } catch (error) {
            next(error);
        }
    },
};
