const createError = require('http-errors');
const GrowthReward = require('../Models/GrowthReward');
const Subscription = require('../Models/Subscription');
const { growthRewardSchema } = require('../Middlewares/validation');
const { fetchChallengeProfit } = require('../Services/growthProfit');

/** What a grant is worth. */
const REWARD_TIER = 'alpha';
const REWARD_DAYS = 3;

/** Each grant doubles the bar: 500, then 1000, then 2000. */
const nextThreshold = current => current * 2;

/** Whether realised profit has reached the account's current target. */
const shouldGrant = (profit, threshold) => profit >= threshold;

const daysFromNow = days => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

/**
 * Validates the body and reads the account's realised profit from Deriv.
 *
 * The read is the server's own — a figure the client supplied would hand
 * anyone free premium for as long as they cared to keep posting one.
 */
const readProfitAndLadder = async body => {
    const { value, error } = growthRewardSchema.validate(body || {});
    if (error) throw createError(400, error.message);

    const { loginids, accessToken } = value;

    /* The ladder row is created before the read, because its startedAt is the
       window the read uses: an account joining now counts from now. */
    let ladder = await GrowthReward.findOne({ loginids: { $in: loginids } });
    if (!ladder) ladder = await GrowthReward.create({ loginids });

    const since = Math.floor(new Date(ladder.startedAt).getTime() / 1000);

    let profit;
    try {
        profit = await fetchChallengeProfit(accessToken, loginids[0], since);
    } catch (e) {
        // A rejected token is the caller's problem, not a server fault — and it
        // must never result in a grant on unverified profit.
        throw createError(e.status || 502, e.message || 'Could not read your profit from Deriv');
    }

    return { loginids, profit, ladder };
};

module.exports = {
    nextThreshold,
    shouldGrant,

    /**
     * POST /api/rewards/growth/check
     *
     * Read-only. Says where the account stands and whether it has earned a
     * grant, but never writes one: the reward is claimed by hand, so granting
     * here would hand it over before the user ever saw the button.
     */
    check: async (req, res, next) => {
        try {
            const { profit, ladder } = await readProfitAndLadder(req.body);

            res.json({
                profit,
                threshold: ladder.threshold,
                grantsClaimed: ladder.grantsClaimed,
                claimable: shouldGrant(profit, ladder.threshold),
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/rewards/growth/claim
     *
     * Grants the 3 days, on a profit the server has just verified for itself.
     */
    claim: async (req, res, next) => {
        try {
            const { loginids, profit, ladder } = await readProfitAndLadder(req.body);
            const threshold = ladder.threshold;

            if (!shouldGrant(profit, threshold)) {
                throw createError(400, 'That reward has not been earned yet');
            }

            /* Bump the ladder first, conditional on the threshold still being
               the one just read. Two requests racing means only one matches a
               document, so only one goes on to write a subscription — a
               double-click cannot buy two grants. */
            const bumped = await GrowthReward.findOneAndUpdate(
                { _id: ladder._id, threshold },
                {
                    $set: { threshold: nextThreshold(threshold), lastGrantedAt: new Date() },
                    $inc: { grantsClaimed: 1 },
                },
                { new: true }
            );

            if (!bumped) throw createError(409, 'That reward has already been claimed');

            const expiresAt = daysFromNow(REWARD_DAYS);
            await Subscription.create({
                loginids,
                tier: REWARD_TIER,
                expiresAt,
                status: 'active',
                paymentId: `reward:growth:${bumped.grantsClaimed}`,
            });

            res.json({
                granted: true,
                profit,
                tier: REWARD_TIER,
                days: REWARD_DAYS,
                expiresAt,
                threshold: bumped.threshold,
                grantsClaimed: bumped.grantsClaimed,
            });
        } catch (error) {
            next(error);
        }
    },
};
