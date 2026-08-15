/**
 * Hourly O5U4 printer.
 *
 * Runs entirely server-side: once an admin starts a session it keeps trading
 * whether or not any browser is open. One round per clock hour, where a round is
 * the O5U4 pair — Over 5 and Under 4 bought together, covering every last digit
 * except 4 and 5.
 *
 * Scheduling deliberately uses a one-minute tick rather than an hourly timer:
 *  - an hourly interval drifts and resets on redeploy (deploy at :59 and the
 *    hour is silently skipped),
 *  - the hour is claimed atomically per session, so a restart mid-hour still
 *    places a missed round and can never place two,
 *  - within an hour the engine waits for a genuine O5U4 setup instead of firing
 *    at :00 regardless, so "one per hour" is a ceiling, not a quota.
 */

const PrinterSession = require('../Models/PrinterSession');
const { decryptToken } = require('./printerCrypto');
const { SYMBOLS, fetchTickHistory, fetchBalance, purchaseContract } = require('./printerDeriv');

const TICK_MS = 60 * 1000;
const TICK_COUNT = 500; // sample size the digit-frequency conditions are judged on
const SETTLE_AFTER_MS = 30 * 1000; // 1-tick legs are long done by then
const MAX_TRADES_KEPT = 200;

let timer = null;
let running = false;

// ── O5U4 analysis ────────────────────────────────────────────────────────────

/** Decimal places actually used by a market, so 1234.5 reads as digit 0 not 5. */
const decimalsOf = prices =>
    prices.reduce((max, p) => Math.max(max, (String(p).split('.')[1] || '').length), 2);

const lastDigitOf = (price, decimals) => {
    let dec = String(price).split('.')[1] || '';
    while (dec.length < decimals) dec += '0';
    return Number(dec.slice(-1));
};

const toDigits = prices => {
    const decimals = decimalsOf(prices);
    return prices.map(p => lastDigitOf(p, decimals));
};

/**
 * O5U4 entry conditions for one market:
 *   1. the latest digit is 4 or 5   (price just landed in the dead zone)
 *   2. the least-appearing digit is 4 or 5   (the dead zone is the rarest)
 *   3. the most-appearing digit sits outside 4-5
 * Score favours the widest gap between the most and least frequent digit.
 */
const scoreSymbol = digits => {
    if (digits.length < 100) return null;

    const current = digits[digits.length - 1];
    if (current !== 4 && current !== 5) return null;

    const counts = new Array(10).fill(0);
    digits.forEach(d => counts[d]++);

    const seen = counts.map((count, digit) => ({ digit, count })).filter(e => e.count > 0);
    if (!seen.length) return null;

    const sorted = [...seen].sort((a, b) => a.count - b.count);
    const least = sorted[0];
    const most = sorted[sorted.length - 1];

    if (least.digit !== 4 && least.digit !== 5) return null;
    if (!(most.digit > 5 || most.digit < 4)) return null;

    return {
        score: (most.count - least.count) * (digits.length / 100),
        current,
        least: least.digit,
        most: most.digit,
        sampleSize: digits.length,
    };
};

/** Best qualifying market across all symbols, or null when none qualifies. */
const pickBestSetup = ticksBySymbol => {
    let best = null;
    for (const symbol of SYMBOLS) {
        const prices = ticksBySymbol[symbol];
        if (!Array.isArray(prices) || prices.length < 100) continue;
        const result = scoreSymbol(toDigits(prices));
        if (result && (!best || result.score > best.score)) best = { symbol, ...result };
    }
    return best;
};

// ── Rounds ───────────────────────────────────────────────────────────────────

const hourKeyNow = () => new Date().toISOString().slice(0, 13); // e.g. 2026-08-15T14

const legsFor = (symbol, stake) => [
    {
        contract_type: 'DIGITOVER',
        barrier: '5',
        params: {
            amount: stake,
            basis: 'stake',
            contract_type: 'DIGITOVER',
            duration: 1,
            duration_unit: 't',
            underlying_symbol: symbol,
            barrier: '5',
        },
    },
    {
        contract_type: 'DIGITUNDER',
        barrier: '4',
        params: {
            amount: stake,
            basis: 'stake',
            contract_type: 'DIGITUNDER',
            duration: 1,
            duration_unit: 't',
            underlying_symbol: symbol,
            barrier: '4',
        },
    },
];

/** Place one O5U4 round for a session whose hour has already been claimed. */
const placeRound = async (session, setup) => {
    const token = decryptToken(session.tokenEnc);
    const { account_id: accountId, account_type: accountType, currency, appId, stake } = session;

    // Captured before the buys so the post-settlement delta is the round's profit.
    const balanceBefore = await fetchBalance(token, appId, accountId).catch(() => null);

    // Both legs go out together rather than one after the other. These are 1-tick
    // contracts, so the round-trip between two sequential buys can straddle a tick
    // boundary and settle the pair against different digits — which takes the
    // both-lose rate from 20% to 36% for no gain. Firing in parallel narrows the
    // gap to network jitter. The per-call catch keeps one leg's network failure
    // from rejecting the pair.
    const legs = legsFor(setup.symbol, stake);
    const results = await Promise.all(
        legs.map(leg =>
            purchaseContract({
                token,
                appId,
                accountId,
                accountType,
                currency,
                contractParameters: leg.params,
            }).catch(err => ({ error: err?.message || 'Purchase failed' }))
        )
    );

    const placed = legs.map((leg, i) => ({
        contract_type: leg.contract_type,
        barrier: leg.barrier,
        contract_id: results[i].contract_id || '',
        buy_price: results[i].buy_price || 0,
        transaction_id: results[i].transaction_id || '',
        error: results[i].error || '',
    }));

    const filled = placed.filter(l => l.contract_id);
    const anyFilled = filled.length > 0;
    // One leg filling alone is not an O5U4 round — it is a naked 40% bet. Worth
    // surfacing rather than logging it as a normal round.
    const partial = anyFilled && filled.length < legs.length;
    const trade = {
        hourKey: session.lastHourKey,
        symbol: setup.symbol,
        stake,
        legs: placed,
        balanceBefore: balanceBefore ?? 0,
        profit: anyFilled ? null : 0,
        status: anyFilled ? 'open' : 'failed',
        reason: !anyFilled
            ? placed.map(l => l.error).filter(Boolean).join('; ') || 'Purchase failed'
            : partial
              ? `PARTIAL — only ${filled[0].contract_type} filled: ` +
                `${placed.map(l => l.error).filter(Boolean).join('; ')}`
              : `last=${setup.current} least=${setup.least} most=${setup.most}`,
        placedAt: new Date(),
        settledAt: anyFilled ? null : new Date(),
    };

    session.trades.push(trade);
    if (session.trades.length > MAX_TRADES_KEPT) {
        session.trades = session.trades.slice(-MAX_TRADES_KEPT);
    }
    await session.save();

    console.log(
        `[Printer] ${session.loginid} ${trade.status === 'failed' ? 'FAILED' : 'placed'} O5U4 on ${setup.symbol} ` +
            `(${trade.reason})`
    );
};

/**
 * Resolve rounds whose legs have settled. Profit comes from the account balance
 * delta, which nets both legs in one reading. It assumes the printer is the only
 * thing trading this account — manual trades on it during the same window would
 * skew the figure.
 */
const settleOpenRounds = async session => {
    const pending = session.trades.filter(
        t => t.status === 'open' && Date.now() - new Date(t.placedAt).getTime() >= SETTLE_AFTER_MS
    );
    if (!pending.length) return false;

    const token = decryptToken(session.tokenEnc);
    const balance = await fetchBalance(token, session.appId, session.account_id).catch(() => null);
    if (balance === null) return false;

    // Oldest first, so a backlog after downtime settles in order.
    pending.sort((a, b) => new Date(a.placedAt) - new Date(b.placedAt));
    let runningBalance = balance;

    for (let i = pending.length - 1; i >= 0; i--) {
        const trade = pending[i];
        const profit = Number((runningBalance - trade.balanceBefore).toFixed(2));
        trade.profit = profit;
        trade.status = 'settled';
        trade.settledAt = new Date();
        runningBalance = trade.balanceBefore;

        session.stats.trades += 1;
        session.stats.profit = Number((session.stats.profit + profit).toFixed(2));
        if (profit >= 0) session.stats.wins += 1;
        else session.stats.losses += 1;
    }

    // Limits are enforced here rather than in the browser — the browser is gone.
    if (session.takeProfit > 0 && session.stats.profit >= session.takeProfit) {
        session.active = false;
        session.stoppedReason = 'Take profit reached';
    } else if (session.stopLoss > 0 && session.stats.profit <= -Math.abs(session.stopLoss)) {
        session.active = false;
        session.stoppedReason = 'Stop loss reached';
    }

    await session.save();
    if (!session.active) console.log(`[Printer] ${session.loginid} stopped — ${session.stoppedReason}`);
    return true;
};

// ── Scheduler ────────────────────────────────────────────────────────────────

const tick = async () => {
    if (running) return; // a slow Deriv call must not overlap the next minute
    running = true;

    try {
        const sessions = await PrinterSession.find({ active: true });
        if (!sessions.length) return;

        for (const session of sessions) {
            await settleOpenRounds(session).catch(err =>
                console.error(`[Printer] settle failed for ${session.loginid}:`, err.message)
            );
        }

        const hourKey = hourKeyNow();
        const waiting = sessions.filter(s => s.active && s.lastHourKey !== hourKey);
        if (!waiting.length) return;

        const ticks = await fetchTickHistory(SYMBOLS, TICK_COUNT);
        const setup = pickBestSetup(ticks);
        if (!setup) return; // no valid O5U4 this minute — try again next minute

        for (const session of waiting) {
            // Atomic claim: only the first caller gets the document back, so a
            // second instance or an overlapping tick cannot double-place.
            const claimed = await PrinterSession.findOneAndUpdate(
                { _id: session._id, active: true, lastHourKey: { $ne: hourKey } },
                { $set: { lastHourKey: hourKey } },
                { new: true }
            );
            if (!claimed) continue;

            await placeRound(claimed, setup).catch(err =>
                console.error(`[Printer] round failed for ${claimed.loginid}:`, err.message)
            );
        }
    } catch (err) {
        console.error('[Printer] tick error:', err.message);
    } finally {
        running = false;
    }
};

const start = () => {
    if (timer) return;
    console.log('[Printer] Hourly O5U4 engine started (1-minute tick)');
    timer = setInterval(() => tick().catch(() => {}), TICK_MS);
    tick().catch(() => {});
};

module.exports = { start, tick, pickBestSetup, hourKeyNow };
