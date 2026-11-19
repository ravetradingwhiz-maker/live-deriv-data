const createError = require('http-errors');
const Admin = require('../Models/Admin');
const Subscription = require('../Models/Subscription');
const Payment = require('../Models/Payment');
const Setting = require('../Models/Setting');
const { TIERS, getTiers } = require('../config/tiers');

// Deriv v4 markup-statistics REST endpoint (must be called server-side with a
// read-scoped app token — the browser gets 403). Mirrors quantum-vault.
const DERIV_V4_URL = 'https://api.derivws.com/applications/v1/markup-statistics';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MARKUP_CACHE_TTL_MS = 5 * 60 * 1000;
const markupCache = new Map();

const normalizeLoginid = v =>
    String(v || '')
        .trim()
        .toUpperCase();

module.exports = {
    // GET /api/admin/check?loginid=ROT90364524           (single)
    // GET /api/admin/check?loginids=ROT90364524,CR123456  (any-match)  (public — used by the frontend)
    check: async (req, res, next) => {
        try {
            const raw = req.query.loginids || req.query.loginid || '';
            const loginids = String(raw)
                .split(',')
                .map(normalizeLoginid)
                .filter(Boolean);
            if (!loginids.length) return res.json({ isAdmin: false, role: null });
            const admin = await Admin.findOne({ loginid: { $in: loginids } });
            res.json({ isAdmin: !!admin, role: admin ? admin.role : null });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/admin  { loginid }
    add: async (req, res, next) => {
        try {
            const loginid = normalizeLoginid(req.body.loginid);
            if (!loginid) throw createError(422, 'A loginid is required');
            const existing = await Admin.findOne({ loginid });
            if (existing) return res.json({ ok: true, created: false, loginid, message: 'Already an admin' });
            await Admin.create({ loginid, role: 'admin' });
            res.status(201).json({ ok: true, created: true, loginid });
        } catch (error) {
            next(error);
        }
    },

    // GET /api/admin/list
    list: async (req, res, next) => {
        try {
            const admins = await Admin.find({}, 'loginid role createdAt').sort('-createdAt');
            res.json({ count: admins.length, admins });
        } catch (error) {
            next(error);
        }
    },

    // DELETE /api/admin  { loginid }
    remove: async (req, res, next) => {
        try {
            const loginid = normalizeLoginid(req.body.loginid || req.query.loginid);
            if (!loginid) throw createError(422, 'loginid is required');
            const r = await Admin.deleteOne({ loginid });
            res.json({ ok: true, removed: r.deletedCount });
        } catch (error) {
            next(error);
        }
    },

    // ── Markup (Deriv v4 REST proxy) ──────────────────────────────────────────
    // GET /api/admin/markup?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    // Filters Deriv's breakdown down to the single configured app id.
    markup: async (req, res, next) => {
        try {
            const { date_from, date_to } = req.query;
            if (!DATE_RE.test(date_from || '') || !DATE_RE.test(date_to || ''))
                throw createError(422, 'date_from and date_to are required (YYYY-MM-DD)');

            const token = process.env.MARKUP_API_TOKEN;
            const appId = process.env.MARKUP_APP_ID || process.env.CLIENT_ID;
            if (!token || !appId) throw createError(503, 'MARKUP_API_TOKEN / MARKUP_APP_ID not configured on the server');

            const cacheKey = `${String(appId)}:${String(date_from)}:${String(date_to)}`;
            const cached = markupCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < MARKUP_CACHE_TTL_MS) {
                return res.json(cached.data);
            }

            const url = `${DERIV_V4_URL}?date_from=${encodeURIComponent(date_from)}&date_to=${encodeURIComponent(date_to)}`;
            const r = await fetch(url, {
                headers: { Authorization: `Bearer ${token}`, 'Deriv-App-ID': String(appId) },
            });
            const json = await r.json().catch(() => null);
            if (!r.ok || !json) return res.status(r.status || 502).json(json || { message: 'Deriv markup error' });

            const bd = Array.isArray(json?.data?.breakdown) ? json.data.breakdown : [];
            const row = bd.find(x => String(x.app_id) === String(appId));
            const payload = row
                ? {
                      markup: row.app_markup_usd ?? 0,
                      volume: row.volume_usd ?? 0,
                      payout: row.payout_usd ?? 0,
                      contracts: row.contract_count ?? 0,
                      clients: row.client_count ?? 0,
                      app_id: String(appId),
                  }
                : { markup: 0, volume: 0, payout: 0, contracts: 0, clients: 0, app_id: String(appId) };

            markupCache.set(cacheKey, { timestamp: Date.now(), data: payload });
            res.json(payload);
        } catch (error) {
            next(error);
        }
    },

    // ── Subscriptions CRUD ───────────────────────────────────────────────────
    // GET /api/admin/subscriptions?q=&status=
    listSubscriptions: async (req, res, next) => {
        try {
            const filter = {};
            const status = String(req.query.status || '').trim();
            if (status === 'active' || status === 'expired') filter.status = status;
            const q = String(req.query.q || '').trim();
            if (q) filter.$or = [{ loginids: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];
            const subs = await Subscription.find(filter).sort('-createdAt').limit(1000).lean();
            res.json({ count: subs.length, subscriptions: subs });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/admin/subscriptions  { loginids: [..] | "a,b", tier, months?, email? }
    createSubscription: async (req, res, next) => {
        try {
            const raw = req.body.loginids ?? req.body.loginid ?? '';
            const loginids = (Array.isArray(raw) ? raw : String(raw).split(','))
                .map(s => String(s).trim())
                .filter(Boolean);
            const tier = String(req.body.tier || '').trim();
            if (!loginids.length) throw createError(422, 'at least one loginid is required');
            if (!TIERS[tier]) throw createError(422, 'tier must be alpha, quantum or apex');
            const months = Number(req.body.months) || TIERS[tier].months;
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + months);
            const sub = await Subscription.create({
                loginids,
                email: String(req.body.email || ''),
                tier,
                startedAt: new Date(),
                expiresAt,
                status: 'active',
                paymentId: 'admin-grant',
            });
            res.status(201).json({ ok: true, subscription: sub });
        } catch (error) {
            next(error);
        }
    },

    // PATCH /api/admin/subscriptions/:id  { tier?, status?, expiresAt?, loginids? }
    updateSubscription: async (req, res, next) => {
        try {
            const patch = {};
            if (req.body.loginids != null) {
                const raw = req.body.loginids;
                patch.loginids = (Array.isArray(raw) ? raw : String(raw).split(','))
                    .map(s => String(s).trim())
                    .filter(Boolean);
            }
            if (req.body.tier) {
                if (!TIERS[req.body.tier]) throw createError(422, 'invalid tier');
                patch.tier = req.body.tier;
            }
            if (req.body.status) {
                if (!['active', 'expired'].includes(req.body.status)) throw createError(422, 'invalid status');
                patch.status = req.body.status;
            }
            if (req.body.expiresAt) {
                const d = new Date(req.body.expiresAt);
                if (Number.isNaN(d.getTime())) throw createError(422, 'invalid expiresAt');
                patch.expiresAt = d;
            }
            const sub = await Subscription.findByIdAndUpdate(req.params.id, patch, { new: true });
            if (!sub) throw createError(404, 'subscription not found');
            res.json({ ok: true, subscription: sub });
        } catch (error) {
            next(error);
        }
    },

    // DELETE /api/admin/subscriptions/:id
    deleteSubscription: async (req, res, next) => {
        try {
            const r = await Subscription.deleteOne({ _id: req.params.id });
            res.json({ ok: true, removed: r.deletedCount });
        } catch (error) {
            next(error);
        }
    },

    // ── Payments ─────────────────────────────────────────────────────────────
    // GET /api/admin/payments?status=&q=
    listPayments: async (req, res, next) => {
        try {
            const filter = {};
            const status = String(req.query.status || '').trim();
            if (['pending', 'paid', 'expired', 'failed'].includes(status)) filter.status = status;
            const q = String(req.query.q || '').trim();
            if (q) filter.$or = [{ orderId: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];
            const payments = await Payment.find(filter).sort('-createdAt').limit(1000).lean();
            res.json({ count: payments.length, payments });
        } catch (error) {
            next(error);
        }
    },

    // ── Pricing ──────────────────────────────────────────────────────────────
    // GET /api/admin/pricing
    getPricing: async (req, res, next) => {
        try {
            res.json({ tiers: await getTiers(), defaults: TIERS });
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/admin/pricing  { alpha:{priceUSD,months}, quantum:{...}, apex:{...} }
    setPricing: async (req, res, next) => {
        try {
            const body = req.body || {};
            const value = {};
            for (const key of Object.keys(TIERS)) {
                const o = body[key];
                if (!o) continue;
                const entry = {};
                if (o.priceUSD != null && !Number.isNaN(Number(o.priceUSD))) entry.priceUSD = Number(o.priceUSD);
                if (o.months != null && !Number.isNaN(Number(o.months))) entry.months = Number(o.months);
                if (Object.keys(entry).length) value[key] = entry;
            }
            await Setting.updateOne({ key: 'pricing' }, { $set: { value } }, { upsert: true });
            res.json({ ok: true, tiers: await getTiers() });
        } catch (error) {
            next(error);
        }
    },
};
