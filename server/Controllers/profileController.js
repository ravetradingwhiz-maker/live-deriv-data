const createError = require('http-errors');
const Profile = require('../Models/Profile');
const { nicknameSchema } = require('../Middlewares/validation');
const { fetchAccounts, getAppId } = require('../Services/printerDeriv');

const parseLoginids = raw =>
    String(raw || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 50);

module.exports = {
    /**
     * GET /api/profile?loginids=CR123,VRTC456
     *
     * Returns the chosen name, or null when none has been set. Unauthenticated,
     * like the subscription check: a display name the user picked for
     * themselves is not a secret, and requiring a token here would add a Deriv
     * round-trip to every dashboard load.
     *
     * Writing one does require proof, which is what stops anyone renaming
     * anyone.
     */
    get: async (req, res, next) => {
        try {
            const loginids = parseLoginids(req.query.loginids);
            if (!loginids.length) return res.json({ nickname: null });

            const profile = await Profile.findOne({ loginids: { $in: loginids } });
            res.json({ nickname: (profile && profile.nickname) || null });
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/profile/nickname
     *
     * Verifies the token actually owns the account before writing. Deriv
     * loginids are guessable, so without this anyone could rename anyone.
     */
    setNickname: async (req, res, next) => {
        try {
            const { value, error } = nicknameSchema.validate(req.body || {});
            if (error) throw createError(400, error.message);

            const { loginids, accessToken, nickname } = value;

            let owned;
            try {
                owned = await fetchAccounts(accessToken, getAppId());
            } catch (e) {
                throw createError(e.status || 502, e.message || 'Could not verify your account with Deriv');
            }

            const ownedIds = new Set((owned || []).map(a => String(a.account_id)));
            if (!loginids.some(id => ownedIds.has(String(id)))) {
                throw createError(403, 'That account does not belong to this login');
            }

            /* Upserted atomically rather than read-then-write: two saves racing
               would otherwise each find nothing and each insert a row. */
            const profile = await Profile.findOneAndUpdate(
                { loginids: { $in: loginids } },
                { $set: { nickname }, $setOnInsert: { loginids } },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );

            res.json({ nickname: profile.nickname });
        } catch (error) {
            next(error);
        }
    },
};
