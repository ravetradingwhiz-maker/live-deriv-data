/**
 * Hourly Over 2 / Under 7 printer.
 *
 * Runs entirely server-side: once an admin starts a session it keeps trading
 * whether or not any browser is open.
 *
 * Each clock hour the session trades rounds until it banks its hourly target
 * (default 2), then idles until the next hour.
 *
 * A normal round buys Over 2 and Under 7 together, both legs at the same stake:
 *   digit 3-6 (40%) — both legs win   → +0.72 x stake
 *   digit 0-2 (30%) — Under 7 only    → -0.64 x stake
 *   digit 7-9 (30%) — Over 2 only     → -0.64 x stake
 * The two ranges overlap, so every digit pays something and no round is a total
 * loss. The trade-off is that 60% of rounds end slightly down.
 *
 * A losing round leaves a deficit and puts the session into recovery: the next
 * round is a single Even at baseStake x multiplier; each further loss retries
 * at (previous recovery stake x multiplier), still Even. This ladder is
 * uncapped by design and escalates until a round wins, at which point the
 * deficit clears and the session goes straight back to Over 2 / Under 7.
 *
 * Neither the hour nor the recovery ladder is capped by round count or stake
 * multiple — the session stop-loss is the only brake, so it must be set before
 * this runs on real money. It is checked twice: BEFORE a round is placed
 * (wouldBreachStopLoss, against the round's worst-case loss, so a large
 * martingaled stake can't blow past the limit in one shot) and again after a
 * round settles (in settleOpenRounds, against the actual result).
 *
 * Scheduling deliberately uses a one-minute tick rather than an hourly timer:
 *  - an hourly interval drifts and resets on redeploy (deploy at :59 and the
 *    hour is silently skipped),
 *  - the hour is claimed atomically per session, so a restart mid-hour still
 *    places a missed round and can never place two.
 */

const PrinterSession = require('../Models/PrinterSession');
const { decryptToken } = require('./printerCrypto');
const { SYMBOLS, fetchTickHistory, fetchBalance, purchaseContract } = require('./printerDeriv');

const TICK_MS = 15 * 1000; // the hour is worked in rounds, so the loop runs faster
const TICK_COUNT = 200; // only used to confirm a market is live before trading it
const SETTLE_AFTER_MS = 12 * 1000; // 1-tick legs settle in seconds; this is slack
const MAX_TRADES_KEPT = 200;
const MIN_STAKE = 0.35; // Deriv's floor
// No cap on the recovery ladder — it keeps martingaling until a round wins.
// The session stop-loss is the only brake; without one set, a losing streak
// escalates without limit until Deriv itself rejects a stake it won't accept.

let timer = null;
let running = false;

// ── Market selection ─────────────────────────────────────────────────────────

/**
 * Over 2 / Under 7 has no entry condition to wait for — the pair covers every
 * digit, and measurement on 60k ticks found no predictive signal in the digit
 * history anyway. So the only job here is picking a market that is actually
 * streaming, rotating by the hour so a session spreads across all ten rather
 * than hammering one.
 */
const pickSymbol = (ticksBySymbol, hourKey) => {
    const live = SYMBOLS.filter(s => Array.isArray(ticksBySymbol[s]) && ticksBySymbol[s].length > 0);
    if (!live.length) return null;
    const hour = Number(hourKey.slice(-2)) || 0;
    return live[hour % live.length];
};

// ── Rounds ───────────────────────────────────────────────────────────────────

const hourKeyNow = () => new Date().toISOString().slice(0, 13); // e.g. 2026-08-15T14

const digitLeg = (symbol, stake, contract_type, barrier) => ({
    contract_type,
    barrier: barrier ?? '',
    params: {
        amount: Number(stake.toFixed(2)),
        basis: 'stake',
        contract_type,
        duration: 1,
        duration_unit: 't',
        underlying_symbol: symbol,
        ...(barrier === undefined ? {} : { barrier }),
    },
});

/** Normal round: Over 2 and Under 7 at the same stake, bought together. */
const pairLegs = (symbol, stake) => [
    digitLeg(symbol, stake, 'DIGITOVER', '2'),
    digitLeg(symbol, stake, 'DIGITUNDER', '7'),
];

/**
 * Recovery round: one Even contract, staked as a martingale off the configured
 * base stake rather than off the outstanding deficit.
 *
 *   first attempt  → baseStake x multiplier
 *   each retry     → previous recovery stake x multiplier
 *
 * Always Even. Even/Odd are the same 50% at 1.94x on an independent digit
 * stream, so alternating between them changes nothing about the odds — it was
 * tried and removed as dead complexity, not for a performance reason.
 *
 * Uncapped by design — the ladder keeps escalating until a round wins or the
 * session stop-loss stops it.
 */
const recoveryLegs = (symbol, baseStake, lastRecoveryStake = 0, multiplier = 2) => {
    const next = lastRecoveryStake > 0 ? lastRecoveryStake * multiplier : baseStake * multiplier;
    const stake = Math.max(MIN_STAKE, Number(next.toFixed(2)));
    return [digitLeg(symbol, stake, 'DIGITEVEN')];
};

// Over 2 (1.36x) and Under 7 (1.36x): if one leg wins and the other loses,
// net = 0.36 x stake (win) - stake (loss) = -0.64 x stake. That's the worst
// case for a pair round — it can never lose the full stake, only this fraction.
const PAIR_WORST_CASE_FRACTION = 0.64;

/**
 * Worst-case net loss if the round about to be placed loses outright.
 * Recovery is a single Even contract, so its worst case is the whole stake;
 * a pair round's worst case is bounded because the two legs overlap.
 */
const projectedWorstCaseLoss = (session, isRecovery) => {
    if (isRecovery) {
        const last = Number(session.lastRecoveryStake) || 0;
        const multiplier = Number(session.recoveryMultiplier) || 2;
        const next = last > 0 ? last * multiplier : session.stake * multiplier;
        return Math.max(MIN_STAKE, Number(next.toFixed(2)));
    }
    return Number((session.stake * PAIR_WORST_CASE_FRACTION).toFixed(2));
};

/**
 * Would the round about to be placed, if it loses outright, take the session
 * past its stop-loss? Checked BEFORE the purchase fires, not just after it
 * settles — otherwise a large martingaled recovery stake can land the session
 * well past the configured limit before the reactive check ever runs. Uses
 * the same field (session.stats.profit) the reactive check compares against,
 * so the two never disagree about where the line is.
 */
const wouldBreachStopLoss = (session, isRecovery) => {
    if (!(session.stopLoss > 0)) return null;
    const maxLoss = projectedWorstCaseLoss(session, isRecovery);
    const worstCase = Number((session.stats.profit - maxLoss).toFixed(2));
    if (worstCase > -Math.abs(session.stopLoss)) return null;
    return { maxLoss, worstCase };
};

/** Place one O5U4 round for a session whose hour has already been claimed. */
const placeRound = async (session, symbol) => {
    // A deficit carried from earlier losing rounds turns this hour into a
    // recovery round instead of a normal pair.
    const deficit = Number(session.deficit) || 0;
    const isRecovery = deficit > 0;

    const breach = wouldBreachStopLoss(session, isRecovery);
    if (breach) {
        session.active = false;
        session.stoppedReason =
            `Stop loss reached — next round could lose ${breach.maxLoss.toFixed(2)}, ` +
            `which would put net P/L at ${breach.worstCase.toFixed(2)} (limit -${session.stopLoss})`;
        session.roundInFlight = false;
        await session.save();
        console.log(`[Printer] ${session.loginid} stopped pre-trade — ${session.stoppedReason}`);
        return;
    }

    const token = decryptToken(session.tokenEnc);
    const { account_id: accountId, account_type: accountType, currency, appId, stake } = session;

    // Captured before the buys so the post-settlement delta is the round's profit.
    const balanceBefore = await fetchBalance(token, appId, accountId).catch(() => null);

    // Both legs go out together rather than one after the other. These are 1-tick
    // contracts, so the round-trip between two sequential buys can straddle a tick
    // boundary and settle the pair against different digits, which breaks the
    // overlap the pair depends on. Firing in parallel narrows the gap to network
    // jitter. The per-call catch keeps one leg's network failure from rejecting
    // the other.
    const legs = isRecovery
        ? recoveryLegs(symbol, stake, Number(session.lastRecoveryStake) || 0, Number(session.recoveryMultiplier) || 2)
        : pairLegs(symbol, stake);
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
    // Half a pair is not the strategy — it is a naked one-sided bet. Worth
    // surfacing rather than logging it as a normal round.
    const partial = anyFilled && filled.length < legs.length;
    const roundStake = legs[0].params.amount;

    const trade = {
        hourKey: session.lastHourKey,
        symbol,
        stake: roundStake,
        mode: isRecovery ? 'recovery' : 'pair',
        legs: placed,
        balanceBefore: balanceBefore ?? 0,
        profit: anyFilled ? null : 0,
        status: anyFilled ? 'open' : 'failed',
        reason: !anyFilled
            ? placed.map(l => l.error).filter(Boolean).join('; ') || 'Purchase failed'
            : partial
              ? `PARTIAL — only ${filled[0].contract_type} filled: ` +
                `${placed.map(l => l.error).filter(Boolean).join('; ')}`
              : isRecovery
                ? `Even ${roundStake} (martingale, ${deficit.toFixed(2)} owed)`
                : `Over 2 + Under 7 at ${roundStake} each`,
        placedAt: new Date(),
        settledAt: anyFilled ? null : new Date(),
    };

    session.trades.push(trade);
    if (session.trades.length > MAX_TRADES_KEPT) {
        session.trades = session.trades.slice(-MAX_TRADES_KEPT);
    }
    // Remember the rung so the next retry can multiply from it.
    if (isRecovery && anyFilled) session.lastRecoveryStake = roundStake;
    // A round that never filled will never reach settlement, so release the
    // in-flight claim here or the session would stop trading permanently.
    if (!anyFilled) session.roundInFlight = false;
    await session.save();

    console.log(
        `[Printer] ${session.loginid} ${trade.status === 'failed' ? 'FAILED' : 'placed'} ` +
            `${isRecovery ? 'RECOVERY Even' : 'Over2+Under7'} on ${symbol} (${trade.reason})`
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

        // Counts toward this hour's target only if it belongs to this hour — a
        // round settling after the hour rolled over must not pollute the new one.
        if (trade.hourKey === session.lastHourKey) {
            session.hourlyProfit = Number((session.hourlyProfit + profit).toFixed(2));
        }

        // A losing round adds to the deficit; a winning one pays it down. While
        // the deficit is above zero the next round is a martingaled Even.
        const deficit = (Number(session.deficit) || 0) - profit;
        session.deficit = Math.max(0, Number(deficit.toFixed(2)));
        // Debt cleared — the ladder resets, so the next recovery starts at the
        // bottom rung instead of continuing from the last one.
        if (session.deficit === 0) session.lastRecoveryStake = 0;
    }

    // The round is done, so the session is free to place the next one.
    session.roundInFlight = false;

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

/**
 * Roll the session onto the current hour, resetting the hour's tally.
 * Returns true when the session may trade this hour.
 */
const rollHour = async (session, hourKey) => {
    if (session.lastHourKey !== hourKey) {
        session.lastHourKey = hourKey;
        session.hourlyProfit = 0;
        session.hourRounds = 0;
        session.hourDone = false;
        session.hourEndedReason = '';
        await session.save();
    }
    return !session.hourDone;
};

/** Target reached, or a brake tripped? Ends the hour if so. */
const checkHourFinished = async session => {
    const target = Number(session.hourlyTarget) || 0;
    const maxLoss = (Number(session.maxHourlyLossMultiple) || 0) * session.stake;

    let reason = '';
    if (target > 0 && session.hourlyProfit >= target) reason = `Target ${target} reached`;
    else if (maxLoss > 0 && session.hourlyProfit <= -maxLoss) reason = `Hourly loss cap (${maxLoss.toFixed(2)}) hit`;

    if (!reason) return false;

    session.hourDone = true;
    session.hourEndedReason = reason;
    await session.save();
    console.log(`[Printer] ${session.loginid} hour ${session.lastHourKey} ended — ${reason}`);
    return true;
};

const tick = async () => {
    if (running) return; // a slow Deriv call must not overlap the next pass
    running = true;

    try {
        const sessions = await PrinterSession.find({ active: true });
        if (!sessions.length) return;

        // Settle first — this hour's tally has to be current before deciding
        // whether the target is met.
        for (const session of sessions) {
            await settleOpenRounds(session).catch(err =>
                console.error(`[Printer] settle failed for ${session.loginid}:`, err.message)
            );
        }

        const hourKey = hourKeyNow();
        const candidates = [];
        for (const session of sessions) {
            if (!session.active) continue;
            if (!(await rollHour(session, hourKey))) continue; // hour already finished
            if (await checkHourFinished(session)) continue; // just finished it
            if (session.roundInFlight) continue; // previous round still settling
            candidates.push(session);
        }
        if (!candidates.length) return;

        // There is no setup to wait for, so the only reason to touch the market
        // data is to confirm something is actually streaming before buying on it.
        const ticks = await fetchTickHistory(SYMBOLS, TICK_COUNT);
        const symbol = pickSymbol(ticks, hourKey);
        if (!symbol) return; // no market responded — retry next pass

        for (const session of candidates) {
            // Atomic claim on the in-flight flag: only the first caller gets the
            // document back, so a second instance or an overlapping pass cannot
            // place two rounds at once.
            const claimed = await PrinterSession.findOneAndUpdate(
                { _id: session._id, active: true, roundInFlight: false, hourDone: false },
                { $set: { roundInFlight: true }, $inc: { hourRounds: 1 } },
                { new: true }
            );
            if (!claimed) continue;

            await placeRound(claimed, symbol).catch(async err => {
                console.error(`[Printer] round failed for ${claimed.loginid}:`, err.message);
                // Never leave the flag stuck, or the session stops trading forever.
                await PrinterSession.updateOne({ _id: claimed._id }, { $set: { roundInFlight: false } });
            });
        }
    } catch (err) {
        console.error('[Printer] tick error:', err.message);
    } finally {
        running = false;
    }
};

const start = () => {
    if (timer) return;
    console.log('[Printer] Hourly Over2/Under7 engine started (1-minute tick)');
    timer = setInterval(() => tick().catch(() => {}), TICK_MS);
    tick().catch(() => {});
};

module.exports = { start, tick, pickSymbol, pairLegs, recoveryLegs, hourKeyNow };
