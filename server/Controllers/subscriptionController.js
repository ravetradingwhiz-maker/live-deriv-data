const Subscription = require('../Models/Subscription');
const { TIERS, tiersForProduct } = require('../config/tiers');

module.exports = {
    // GET /api/subscription?loginids=CR123,VRTC456[&product=quantumsyn]
    // Returns the highest active tier across the supplied loginids.
    check: async (req, res, next) => {
        try {
            const raw = String(req.query.loginids || '').trim();
            /* NYX EA's customers have no Deriv account, so their
               subscriptions are keyed by the email the order was paid
               with. Everything else still asks by loginid and is
               unaffected: this only ever adds a second way in, and a
               caller supplying neither gets the same answer as before. */
            const email = String(req.query.email || '').trim().toLowerCase();

            const loginids = raw
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
                .slice(0, 50);
            if (!loginids.length && !email) return res.json({ active: false });

            /* Which product is asking. Defaults to nexora so every existing
               caller keeps the behaviour it had, and quantumsyn asks for its
               own by name. This filter is what keeps the two apart: an Apex
               subscription is invisible to quantumsyn and a Quantum one is
               invisible to live-deriv, whatever loginids they share. An
               unknown product matches no tiers and so is never active. */
            const product = String(req.query.product || 'nexora');
            const tiers = tiersForProduct(product);
            if (!tiers.length) return res.json({ active: false });

            const now = new Date();
            /* Any of the ways this caller can be known. Built as a list so
               an empty one is impossible — `$or: []` is a Mongo error, and
               it would be reached by anyone asking with only an email. */
            const identifies = [];
            if (loginids.length) {
                // `loginids` (current array form) or legacy single `loginid`.
                identifies.push({ loginids: { $in: loginids } }, { loginid: { $in: loginids } });
            }
            if (email) identifies.push({ email });

            const subs = await Subscription.find({
                $or: identifies,
                tier: { $in: tiers },
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
