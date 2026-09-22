/**
 * Subscription lifetime: how long one lasts, and retiring it when it is over.
 *
 * `Subscription.status` is a stored field, and nothing used to write it after
 * creation — so every subscription ever sold still read `active`, however long
 * ago it lapsed. Access was never actually wrong, because the check in
 * subscriptionController requires `expiresAt > now` as well, but the admin list
 * reads the stored field and so showed a green "active" on dead rows.
 *
 * The sweep below makes the field true. Nothing about access depends on it
 * running: the date comparison remains the real gate, and this only stops the
 * bookkeeping from lying.
 */

const Subscription = require('../Models/Subscription');

/** Days in the month `m` (0-based) of year `y`. */
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

/**
 * Adds whole months, clamping to the last day of the target month.
 *
 * `setMonth` alone rolls the overflow forward: 31 January + 1 month lands on
 * 3 March, because 31 February does not exist. That quietly handed out a few
 * free days on every end-of-month purchase. Clamping gives 28 February, which
 * is what "one month" is normally taken to mean.
 */
const addMonths = (date, months) => {
    const d = new Date(date);
    const day = d.getDate();
    // Move off the day-of-month first, so the month arithmetic cannot overflow
    // on its own before the clamp is applied.
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    d.setDate(Math.min(day, daysInMonth(d.getFullYear(), d.getMonth())));
    return d;
};

/**
 * Marks every lapsed subscription `expired`.
 * @returns {Promise<number>} how many rows changed.
 */
const sweepExpired = async () => {
    const result = await Subscription.updateMany(
        { status: 'active', expiresAt: { $lte: new Date() } },
        { $set: { status: 'expired' } }
    );
    return result.modifiedCount ?? 0;
};

/** How often to sweep. Hourly is far finer than the day-level granularity the
    admin list shows, and the query is one indexed update. */
const SWEEP_MS = 60 * 60 * 1000;

let timer = null;

const runSweep = async () => {
    try {
        const n = await sweepExpired();
        if (n) console.log(`[subscriptions] marked ${n} expired`);
    } catch (err) {
        console.error('[subscriptions] sweep failed:', err.message);
    }
};

/** Starts the hourly sweep, and runs one now to clear the backlog. */
const start = () => {
    if (timer) return;
    runSweep();
    timer = setInterval(runSweep, SWEEP_MS);
    // Nothing waits on this timer, so it must not hold the process open.
    if (typeof timer.unref === 'function') timer.unref();
};

module.exports = { addMonths, daysInMonth, sweepExpired, start };
