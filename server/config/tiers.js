// Subscription tiers — tier == duration (current pricing). Higher rank unlocks
// everything below it (apex > quantum > alpha). Single source of truth for the
// server; the frontend pricing cards mirror these.
//
// `priceUSD` / `months` / `slotsLeft` can be overridden at runtime by admins
// (stored in the `settings` collection under key 'pricing'); `rank`/`label` are
// fixed in code.
//
// `slotsLeft` is how many seats the pricing card says are left at the current
// price. It is shown to someone deciding whether to spend money, so it should
// track what you will actually honour — set it to 0 to take the line off the
// card rather than leaving a figure that never moves.
const TIERS = {
    alpha: { label: 'Alpha', priceUSD: 100, months: 1, rank: 1, slotsLeft: 12 },
    quantum: { label: 'Quantum', priceUSD: 270, months: 3, rank: 2, slotsLeft: 7 },
    apex: { label: 'Apex', priceUSD: 480, months: 6, rank: 3, slotsLeft: 5 },
};

// Crypto the user can pay with → NOWPayments `pay_currency` code.
// USDT defaults to TRC-20 (cheapest network).
const PAY_CURRENCY = {
    btc: 'btc',
    eth: 'eth',
    usdt: 'usdttrc20', // USDT on the TRON network (shown as "USDT TRX")
};

/**
 * Returns the tier table with any admin price/duration overrides merged in.
 * Falls back to the static defaults if the DB is unavailable.
 */
const getTiers = async () => {
    try {
        const Setting = require('../Models/Setting');
        const doc = await Setting.findOne({ key: 'pricing' }).lean();
        const override = doc && doc.value ? doc.value : null;
        if (!override) return TIERS;
        const merged = {};
        for (const key of Object.keys(TIERS)) {
            const o = override[key] || {};
            merged[key] = {
                ...TIERS[key],
                ...(o.priceUSD != null && !Number.isNaN(Number(o.priceUSD)) ? { priceUSD: Number(o.priceUSD) } : {}),
                ...(o.months != null && !Number.isNaN(Number(o.months)) ? { months: Number(o.months) } : {}),
                // A seat count is a whole number and cannot go below zero,
                // whatever is sitting in the settings document.
                ...(o.slotsLeft != null && !Number.isNaN(Number(o.slotsLeft))
                    ? { slotsLeft: Math.max(0, Math.floor(Number(o.slotsLeft))) }
                    : {}),
            };
        }
        return merged;
    } catch {
        return TIERS;
    }
};

module.exports = { TIERS, PAY_CURRENCY, getTiers };
