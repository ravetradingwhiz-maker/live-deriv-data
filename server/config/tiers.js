// Subscription tiers — tier == duration (current pricing). Higher rank unlocks
// everything below it (apex > quantum > alpha). Single source of truth for the
// server; the frontend pricing cards mirror these.
//
// `priceUSD` / `months` can be overridden at runtime by admins (stored in the
// `settings` collection under key 'pricing'); `rank`/`label` are fixed in code.
const TIERS = {
    alpha: { label: 'Alpha', priceUSD: 100, months: 1, rank: 1 },
    quantum: { label: 'Quantum', priceUSD: 270, months: 3, rank: 2 },
    apex: { label: 'Apex', priceUSD: 480, months: 6, rank: 3 },
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
            };
        }
        return merged;
    } catch {
        return TIERS;
    }
};

module.exports = { TIERS, PAY_CURRENCY, getTiers };
