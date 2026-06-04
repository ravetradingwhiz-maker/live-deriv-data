const Subscription = require('../Models/Subscription');
const { TIERS } = require('../config/tiers');

module.exports = {
    // GET /api/subscription?loginids=CR123,VRTC456
    // Returns the highest active tier across the supplied loginids.
    check: async (req, res, next) => {
        try {
            const raw = String(req.query.loginids || '').trim();
            if (!raw) return res.json({ active: false });

            const loginids = raw
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
                .slice(0, 50);
            if (!loginids.length) return res.json({ active: false });

            const now = new Date();
            const subs = await Subscription.find({
                // `loginids` (current array form) or legacy single `loginid`.
                $or: [{ loginids: { $in: loginids } }, { loginid: { $in: loginids } }],
                status: 'active',
                expiresAt: { $gt: now },
            });

            if (!subs.length) return res.json({ active: false });

            // Pick the strongest tier and its latest expiry.
            let best = subs[0];
            for (const s of subs) {
                if ((TIERS[s.tier]?.rank || 0) > (TIERS[best.tier]?.rank || 0)) best = s;
            }
            const latestExpiry = subs.reduce((max, s) => (s.expiresAt > max ? s.expiresAt : max), subs[0].expiresAt);

            res.json({
                active: true,
                tier: best.tier,
                label: TIERS[best.tier]?.label || best.tier,
                rank: TIERS[best.tier]?.rank || 0,
                expiresAt: latestExpiry,
            });
        } catch (error) {
            next(error);
        }
    },
};
