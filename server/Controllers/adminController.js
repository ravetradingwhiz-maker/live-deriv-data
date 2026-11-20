const createError = require('http-errors');
const Admin = require('../Models/Admin');
const Subscription = require('../Models/Subscription');
const Payment = require('../Models/Payment');
const Setting = require('../Models/Setting');
const { TIERS, getTiers } = require('../config/tiers');
const { addMonths } = require('../Services/subscriptionService');
const { METHOD_DEFS, DEFAULTS: METHOD_DEFAULTS, getPaymentMethods } = require('../config/paymentMethods');
const payhero = require('../Services/payHeroService');

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
            /* Both clauses below can be an $or, and assigning filter.$or twice
               silently drops the first — so they are collected into an $and. */
            const clauses = [];

            /* Effective state, not the stored field. The sweep marks lapsed rows
               `expired` hourly, so between sweeps a row can still read `active`
               with a date in the past; the date is what decides. */
            const status = String(req.query.status || '').trim();
            const now = new Date();
            if (status === 'active') {
                clauses.push({ status: 'active' }, { expiresAt: { $gt: now } });
            } else if (status === 'expired') {
                clauses.push({ $or: [{ status: 'expired' }, { expiresAt: { $lte: now } }] });
            }

            const q = String(req.query.q || '').trim();
            if (q) clauses.push({ $or: [{ loginids: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }] });

            const filter = clauses.length ? { $and: clauses } : {};
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
            // Shared with paid activation so a granted month and a bought one
            // are the same length — `setMonth` alone overflows on the 31st.
            const expiresAt = addMonths(Date.now(), months);
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
                /* Extending a lapsed subscription has to revive it too. The
                   sweep will have set `expired`, and the access check demands
                   both an active status and a future date — so moving only the
                   date would look like it worked and change nothing. An
                   explicit status in the same request still wins. */
                if (!patch.status && d > new Date()) patch.status = 'active';
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

    // PUT /api/admin/pricing  { alpha:{priceUSD,months,slotsLeft}, quantum:{...}, apex:{...} }
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
                // Zero is a meaningful value here — it takes the "slots left"
                // line off the card — so it is stored rather than treated as
                // an empty field.
                if (o.slotsLeft != null && !Number.isNaN(Number(o.slotsLeft))) {
                    entry.slotsLeft = Math.max(0, Math.floor(Number(o.slotsLeft)));
                }
                if (Object.keys(entry).length) value[key] = entry;
            }
            await Setting.updateOne({ key: 'pricing' }, { $set: { value } }, { upsert: true });
            res.json({ ok: true, tiers: await getTiers() });
        } catch (error) {
            next(error);
        }
    },

    // ── Payment methods ──────────────────────────────────────────────────────
    // GET /api/admin/payment-methods
    getPaymentMethods: async (req, res, next) => {
        try {
            res.json({ methods: await getPaymentMethods(), defs: METHOD_DEFS, defaults: METHOD_DEFAULTS });
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/admin/payment-methods  { card: true, mpesa: false, crypto: true }
    setPaymentMethods: async (req, res, next) => {
        try {
            const body = req.body || {};
            const value = {};
            for (const key of Object.keys(METHOD_DEFAULTS)) {
                if (typeof body[key] === 'boolean') value[key] = body[key];
            }
            // Refuse to switch every method off — that would leave a dead checkout.
            if (Object.keys(value).length && !Object.values(value).some(Boolean)) {
                throw createError(422, 'At least one payment method must stay enabled');
            }
            await Setting.updateOne({ key: 'payment_methods' }, { $set: { value } }, { upsert: true });
            res.json({ ok: true, methods: await getPaymentMethods() });
        } catch (error) {
            next(error);
        }
    },

    // ── PayHero service wallet ───────────────────────────────────────────────
    // The float that pays the fee on every M-Pesa push. It empties as you sell,
    // and when it does M-Pesa stops working while everything else carries on.

    // GET /api/admin/payhero/wallet
    payHeroWallet: async (req, res, next) => {
        try {
            const wallet = await payhero.getServiceWalletBalance();
            res.json({
                balance: Number(wallet.available_balance) || 0,
                currency: wallet.currency || 'KES',
                updatedAt: wallet.updated_at || null,
            });
        } catch (error) {
            // A missing key or a PayHero outage is a state of the integration,
            // not a server fault — say which, so the page can show it.
            next(createError(502, error.message));
        }
    },

    // POST /api/admin/payhero/topup  { amount, phone }
    payHeroTopUp: async (req, res, next) => {
        try {
            const amount = Math.round(Number((req.body || {}).amount));
            const phone = String((req.body || {}).phone || '').trim();
            if (!Number.isInteger(amount) || amount < 1) throw createError(422, 'Enter an amount of at least 1 KES');
            if (!phone) throw createError(422, 'Enter the phone number to charge');

            let result;
            try {
                result = await payhero.topUpServiceWallet({ amount, phone });
            } catch (e) {
                // normalisePhone's complaint is the admin's to fix, so it reads
                // as a 422 rather than a gateway failure.
                if (/valid Safaricom number/i.test(e.message)) throw createError(422, e.message);
                throw createError(502, e.message);
            }

            res.json({ ok: true, status: result.status || 'QUEUED', reference: result.reference || '' });
        } catch (error) {
            next(error);
        }
    },
};
