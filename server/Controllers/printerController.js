const createError = require('http-errors');
const Admin = require('../Models/Admin');
const PrinterSession = require('../Models/PrinterSession');
const { encryptToken, decryptToken } = require('../Services/printerCrypto');
const { getAppId, fetchAccounts } = require('../Services/printerDeriv');
const { hourKeyNow } = require('../Services/printerEngine');

const normalizeLoginid = v => String(v || '').trim().toUpperCase();

/**
 * Every printer route is admin-gated server-side. The rest of /api/admin trusts
 * the frontend to hide itself; that is not good enough here, because these
 * endpoints accept a trading token and move real money.
 *
 * Accepts the caller's full loginid list (same contract as /api/admin/check) and
 * keys the session on whichever one is allow-listed, so switching Deriv accounts
 * in the UI never orphans a running session.
 */
const requireAdmin = async req => {
    const raw = req.body?.loginids || req.query?.loginids || req.get('x-admin-loginid') || '';
    const loginids = String(raw).split(',').map(normalizeLoginid).filter(Boolean);
    if (!loginids.length) throw createError(400, 'loginids is required');

    const admin = await Admin.findOne({ loginid: { $in: loginids } });
    if (!admin) throw createError(403, 'Not an admin account');
    return admin.loginid;
};

/**
 * The PAT for this admin: whatever was sent, otherwise the one already stored.
 * Stopping keeps the token on file so restarting never means pasting it again —
 * only "Remove token" clears it.
 */
const resolveToken = async (loginid, supplied) => {
    const token = String(supplied || '').trim();
    if (token) return token;

    const existing = await PrinterSession.findOne({ loginid });
    if (!existing?.tokenEnc) throw createError(422, 'token is required');
    try {
        return decryptToken(existing.tokenEnc);
    } catch {
        // Key derivation changed (MONGODB_URI rotated) — the stored blob is dead.
        throw createError(422, 'Stored token could not be read — please enter it again');
    }
};

/** Shape returned to the UI. Never includes the stored token. */
const publicSession = session => {
    if (!session) return null;
    const next = new Date();
    next.setUTCMinutes(0, 0, 0);
    next.setUTCHours(next.getUTCHours() + 1);

    return {
        active: session.active,
        // Lets the UI offer a restart without asking for the token again.
        hasToken: Boolean(session.tokenEnc),
        account_id: session.account_id,
        account_type: session.account_type,
        currency: session.currency,
        stake: session.stake,
        stopLoss: session.stopLoss,
        takeProfit: session.takeProfit,
        stoppedReason: session.stoppedReason,
        startedAt: session.startedAt,
        stats: session.stats,
        deficit: session.deficit || 0,
        recoveryMultiplier: session.recoveryMultiplier,
        lastRecoveryStake: session.lastRecoveryStake || 0,
        hourlyTarget: session.hourlyTarget,
        hourlyProfit: session.hourlyProfit || 0,
        hourRounds: session.hourRounds || 0,
        hourDone: session.hourDone,
        hourEndedReason: session.hourEndedReason || '',
        tradedThisHour: session.lastHourKey === hourKeyNow(),
        nextHourAt: session.active ? next.toISOString() : null,
        trades: [...session.trades]
            .slice(-50)
            .reverse()
            .map(t => ({
                hourKey: t.hourKey,
                symbol: t.symbol,
                stake: t.stake,
                mode: t.mode || 'pair',
                status: t.status,
                profit: t.profit,
                reason: t.reason,
                placedAt: t.placedAt,
                legs: t.legs.map(l => ({
                    contract_type: l.contract_type,
                    barrier: l.barrier,
                    contract_id: l.contract_id,
                    buy_price: l.buy_price,
                    error: l.error,
                })),
            })),
    };
};

module.exports = {
    // POST /api/printer/accounts  { loginid, token }
    // Resolves a PAT to its real accounts so the admin can pick one. The token
    // is not stored by this call.
    accounts: async (req, res, next) => {
        try {
            const loginid = await requireAdmin(req);
            const token = await resolveToken(loginid, req.body?.token);

            const appId = getAppId();
            if (!appId) throw createError(503, 'MARKUP_APP_ID is not configured on the server');

            const accounts = await fetchAccounts(token, appId).catch(err => {
                throw createError(err.status === 401 ? 401 : 502, err.message || 'Could not validate token');
            });
            if (!accounts.length) throw createError(422, 'No options accounts found for this token');

            // Demo first, so the safer option is what the UI preselects.
            accounts.sort((a, b) => (a.account_type === b.account_type ? 0 : a.account_type === 'demo' ? -1 : 1));
            res.json({ accounts });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/printer/start  { loginid, token, account_id, stake, stopLoss?, takeProfit? }
    start: async (req, res, next) => {
        try {
            const loginid = await requireAdmin(req);
            const token = await resolveToken(loginid, req.body?.token);
            const accountId = String(req.body?.account_id || '').trim();
            const stake = Number(req.body?.stake);
            const stopLoss = Number(req.body?.stopLoss) || 0;
            const takeProfit = Number(req.body?.takeProfit) || 0;
            const hourlyTarget = Number(req.body?.hourlyTarget) || 2;
            const recoveryMultiplier = Number(req.body?.recoveryMultiplier) || 2;

            if (!accountId) throw createError(422, 'account_id is required');
            if (!Number.isFinite(stake) || stake < 0.35) throw createError(422, 'stake must be at least 0.35');

            const appId = getAppId();
            if (!appId) throw createError(503, 'MARKUP_APP_ID is not configured on the server');

            // Re-resolve so a mismatched token/account pair is caught before the
            // session goes live rather than at the top of the next hour.
            const accounts = await fetchAccounts(token, appId).catch(err => {
                throw createError(err.status === 401 ? 401 : 502, err.message || 'Could not validate token');
            });
            const account = accounts.find(a => a.account_id === accountId);
            if (!account) throw createError(422, 'That account does not belong to this token');

            const session = await PrinterSession.findOneAndUpdate(
                { loginid },
                {
                    $set: {
                        loginid,
                        account_id: account.account_id,
                        account_type: account.account_type,
                        currency: account.currency,
                        tokenEnc: encryptToken(token),
                        appId: String(appId),
                        stake,
                        stopLoss,
                        takeProfit,
                        hourlyTarget,
                        recoveryMultiplier,
                        lastRecoveryStake: 0,
                        hourlyProfit: 0,
                        hourRounds: 0,
                        hourDone: false,
                        hourEndedReason: '',
                        roundInFlight: false,
                        active: true,
                        stoppedReason: '',
                        startedAt: new Date(),
                        // A fresh start never inherits the previous hour's claim
                        // or a deficit from an earlier session.
                        lastHourKey: '',
                        deficit: 0,
                        stats: { trades: 0, wins: 0, losses: 0, profit: 0 },
                        trades: [],
                    },
                },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );

            console.log(
                `[Printer] ${loginid} started on ${account.account_id} (${account.account_type}) ` +
                    `at ${stake} ${account.currency}`
            );
            res.json({ session: publicSession(session), balance: account.balance });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/printer/stop  { loginid }
    stop: async (req, res, next) => {
        try {
            const loginid = await requireAdmin(req);
            const session = await PrinterSession.findOneAndUpdate(
                { loginid },
                { $set: { active: false, stoppedReason: 'Stopped by admin' } },
                { new: true }
            );
            if (!session) throw createError(404, 'No printer session for this account');
            res.json({ session: publicSession(session) });
        } catch (error) {
            next(error);
        }
    },

    // DELETE /api/printer/token  { loginid } — stop and forget the stored PAT.
    removeToken: async (req, res, next) => {
        try {
            const loginid = await requireAdmin(req);
            await PrinterSession.deleteOne({ loginid });
            res.json({ session: null });
        } catch (error) {
            next(error);
        }
    },

    // GET /api/printer/status?loginid=...
    status: async (req, res, next) => {
        try {
            const loginid = await requireAdmin(req);
            const session = await PrinterSession.findOne({ loginid });
            res.json({ session: publicSession(session) });
        } catch (error) {
            next(error);
        }
    },
};
