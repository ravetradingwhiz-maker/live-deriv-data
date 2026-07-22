// Which checkout payment methods are offered. Labels/descriptions are fixed in
// code; the enabled flags are admin-editable at runtime (stored in the
// `settings` collection under key 'payment_methods'), mirroring config/tiers.js.

// Static metadata — the admin UI renders these; ids match the frontend Method type.
const METHOD_DEFS = {
    card: { label: 'Card', desc: 'Credit / debit card via Paystack (USD)' },
    mpesa: { label: 'M-Pesa', desc: 'Safaricom mobile money via Paystack (KES)' },
    crypto: { label: 'Crypto', desc: 'USDT (TRC-20) on the TRON network' },
};

const DEFAULTS = { card: true, mpesa: true, crypto: true };

/**
 * Returns { card: bool, mpesa: bool, crypto: bool } with admin overrides merged
 * over the defaults. Falls back to the defaults if the DB is unavailable.
 */
const getPaymentMethods = async () => {
    try {
        const Setting = require('../Models/Setting');
        const doc = await Setting.findOne({ key: 'payment_methods' }).lean();
        const override = doc && doc.value ? doc.value : null;
        if (!override) return { ...DEFAULTS };

        const merged = {};
        for (const key of Object.keys(DEFAULTS)) {
            merged[key] = typeof override[key] === 'boolean' ? override[key] : DEFAULTS[key];
        }
        // Never leave the checkout with nothing to pay by.
        if (!Object.values(merged).some(Boolean)) return { ...DEFAULTS };
        return merged;
    } catch {
        return { ...DEFAULTS };
    }
};

module.exports = { METHOD_DEFS, DEFAULTS, getPaymentMethods };
