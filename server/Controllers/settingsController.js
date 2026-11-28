const Setting = require('../Models/Setting');

/**
 * Settings the admin flips and everyone else reads.
 *
 * `Setting` is already the key/value store behind pricing and payment
 * methods; this adds the ones that change how the app looks rather than what
 * it charges. They are read by every visitor, signed in or not, so the read
 * is public and deliberately returns nothing but the flags themselves.
 */

/** The key in the Setting collection. */
const KEY = 'appearance';

/**
 * Every setting this file owns, with what it means when nothing is stored.
 *
 * A theme that defaults to on would turn itself on the day this deploys,
 * which is not the admin's decision — so it defaults to off and waits to be
 * asked for.
 */
const DEFAULTS = {
    christmas: false,
    christmasApp: false,
};

const read = async () => {
    const row = await Setting.findOne({ key: KEY }).lean();
    const stored = row && typeof row.value === 'object' && row.value ? row.value : {};
    // Spread over the defaults rather than returning what is stored, so a
    // setting added later is present before anyone has saved it.
    return { ...DEFAULTS, ...stored };
};

module.exports = {
    KEY,
    DEFAULTS,
    read,

    // GET /api/settings/appearance — public. Every visitor needs this to paint.
    getAppearance: async (req, res, next) => {
        try {
            res.json(await read());
        } catch (error) {
            next(error);
        }
    },

    // GET /api/admin/settings — the same values, for the admin page.
    getAdminAppearance: async (req, res, next) => {
        try {
            res.json(await read());
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/admin/settings  { christmas: boolean }
    setAdminAppearance: async (req, res, next) => {
        try {
            const next_ = { ...(await read()) };
            // Only the keys this file knows about, and only as booleans: the
            // body comes from a browser and this value styles every page.
            for (const key of Object.keys(DEFAULTS)) {
                if (req.body[key] !== undefined) next_[key] = Boolean(req.body[key]);
            }
            await Setting.updateOne({ key: KEY }, { $set: { value: next_ } }, { upsert: true });
            res.json(next_);
        } catch (error) {
            next(error);
        }
    },
};
