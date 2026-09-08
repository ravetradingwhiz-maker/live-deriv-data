/**
 * Hourly Differs printer.
 *
 * Runs entirely server-side: once an admin starts a session it keeps trading
 * whether or not any browser is open.
 *
 * Each clock hour the session trades rounds until it banks its hourly target
 * (default 2), then idles until the next hour.
 *
 * A normal round buys one Digit Differs contract:
 *   digit != barrier (90%) — win  → roughly +0.07 x stake
 *   digit == barrier (10%) — loss → -1.00 x stake
 * Nine rounds in ten win, but the win is small against a full-stake loss, so
 * the base round is the trigger rather than the earner: one loss costs about
 * fourteen wins and cannot be ground back inside an hour.
 *
 * A losing round leaves a deficit and puts the session into recovery: the next
 * round is a single Even at the configured recovery start stake; each further
 * loss retries at (previous recovery stake x multiplier), still Even. That
 * ladder is what actually banks the hour — an Even pays 1.94x, so one win
 * clears the deficit and puts the hour in profit. It is uncapped by design and
 * escalates until a round wins, at which point the deficit clears and the
 * session goes straight back to Differs.
 *
 * This replaced an Over 2 / Under 7 pair. The pair's legs overlapped, so 60% of
 * rounds lost a bounded 0.64 x stake and the ladder was entered constantly.
 * Differs enters it on 10% of rounds instead, which is the whole point of the
 * switch — the ladder is where the risk lives.
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

// ── Digit analysis ───────────────────────────────────────────────────────────

/** Below this many ticks a market is treated as not streaming rather than analysed. */
const MIN_SAMPLE = 50;

/**
 * How many decimals a symbol is quoted to.
 *
 * The last digit is the last of those decimals, but JSON numbers have already
 * dropped trailing zeros — 1234.50 arrives as 1234.5 — so reading the final
 * character of the raw number would report 5 where the true digit is 0. The
 * width is recovered from the sample instead: across a few hundred ticks the
 * widest price is the symbol's real pip size, because a tick ending in a
 * non-zero digit turns up almost immediately.
 */
const pipSizeOf = prices => {
    let width = 0;
    for (const price of prices) {
        const text = String(price);
        const dot = text.indexOf('.');
        if (dot >= 0) width = Math.max(width, text.length - dot - 1);
    }
    return width;
};

/** Last digits for a price series, oldest first — the order Deriv returns. */
const digitsOf = prices => {
    const pip = pipSizeOf(prices);
    return prices.map(price => Number(price.toFixed(pip).slice(-1)));
};

/**
 * The digit to buy Differs against on one market: whichever has come up least
 * across the sample, since a Differs round loses only when its barrier lands.
 *
 * Worth being straight about what this is. Deriv's digit streams are uniform
 * and independent, so a digit being rare in the last few hundred ticks says
 * nothing about the next one — the true odds are 90% whichever barrier is
 * picked, and measurement on 60k ticks found no signal here. This chooses the
 * least-seen digit because that is the ranking asked for; it does not make the
 * round more likely to win.
 */
const rarestDigit = digits => {
    const counts = new Array(10).fill(0);
    for (const digit of digits) counts[digit] += 1;

    let best = 0;
    for (let digit = 1; digit < 10; digit++) {
        if (counts[digit] < counts[best]) best = digit;
    }
    return { barrier: String(best), count: counts[best], share: counts[best] / digits.length };
};

/** Markets with enough history to act on, last traded one dropped. */
const usableMarkets = (ticksBySymbol, excludeSymbol) => {
    const out = [];
    for (const symbol of SYMBOLS) {
        // Consecutive rounds never reuse a market.
        if (symbol === excludeSymbol) continue;
        const prices = ticksBySymbol[symbol];
        if (!Array.isArray(prices) || prices.length < MIN_SAMPLE) continue;
        out.push({ symbol, digits: digitsOf(prices) });
    }
    return out;
};

/**
 * Scan every market and return the one whose rarest digit is rarest of all,
 * along with that digit. Null when nothing is streaming.
 */
const scanForDiffers = (ticksBySymbol, excludeSymbol) => {
    const scored = usableMarkets(ticksBySymbol, excludeSymbol).map(market => ({
        ...market,
        ...rarestDigit(market.digits),
    }));
    if (!scored.length) return null;

    scored.sort((a, b) => a.share - b.share);
    return scored[0];
};

/** Are the two most recent digits both odd? History is oldest first. */
const endsWithTwoOdd = digits =>
    digits.length >= 2 && digits[digits.length - 1] % 2 === 1 && digits[digits.length - 2] % 2 === 1;

/**
 * Market for a recovery Even.
 *
 * The first rung of a ladder waits for a market showing two odd digits in a
 * row and takes it immediately; every rung after that fires on whatever is
 * streaming. Returns null while an armed ladder has nothing to trade on yet,
 * which is the signal to hold and look again next pass.
 */
const scanForRecovery = (ticksBySymbol, excludeSymbol, mustWaitForTwoOdd) => {
    const markets = usableMarkets(ticksBySymbol, excludeSymbol);
    if (!markets.length) return null;
    if (!mustWaitForTwoOdd) return markets[0];
    return markets.find(market => endsWithTwoOdd(market.digits)) ?? null;
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

/** Fallback if a caller ever omits the scanned barrier. */
const DEFAULT_DIFFERS_BARRIER = '0';

/**
 * Normal round: one Differs contract. Wins on 9 digits in 10.
 * The barrier comes from `scanForDiffers` — see the note there on what that
 * ranking does and does not buy you.
 */
const differsLegs = (symbol, stake, barrier = DEFAULT_DIFFERS_BARRIER) => [
    digitLeg(symbol, stake, 'DIGITDIFF', barrier),
];

/**
 * Recovery round: one Even contract, martingaled until it lands.
 *
 *   first attempt  → recoveryStartStake (its own setting, not the base stake)
 *   each retry     → previous recovery stake x multiplier
 *
 * The opening rung is configured rather than derived. Differs stakes are sized
 * so one win banks the hour, which makes them far larger than the recovery
 * needs to be: at 1.94x, an Even only has to cover the deficit, and starting
 * the ladder at `baseStake x multiplier` would open several times higher than
 * necessary and burn rungs that the stop-loss would rather have.
 *
 * Always Even. Even/Odd are the same 50% at 1.94x on an independent digit
 * stream, so alternating between them changes nothing about the odds — it was
 * tried and removed as dead complexity, not for a performance reason.
 *
 * Uncapped by design — the ladder keeps escalating until a round wins or the
 * session stop-loss stops it.
 */
const recoveryLegs = (symbol, startStake, lastRecoveryStake = 0, multiplier = 2) => {
    const next = lastRecoveryStake > 0 ? lastRecoveryStake * multiplier : startStake;
    const stake = Math.max(MIN_STAKE, Number(next.toFixed(2)));
    return [digitLeg(symbol, stake, 'DIGITEVEN')];
};

/** The configured opening rung, falling back to the old default. */
const recoveryStartOf = session => {
    const configured = Number(session.recoveryStartStake) || 0;
    return Math.max(MIN_STAKE, configured > 0 ? configured : 1);
};

/**
 * Worst-case net loss if the round about to be placed loses outright.
 *
 * Both round types are a single contract now, so either one can lose its whole
 * stake. The pair round this replaced could not — its two legs overlapped, so
 * only 0.64 x stake was ever at risk. Differs has no such floor.
 */
const projectedWorstCaseLoss = (session, isRecovery) => {
    if (isRecovery) {
        const last = Number(session.lastRecoveryStake) || 0;
        const multiplier = Number(session.recoveryMultiplier) || 2;
        const next = last > 0 ? last * multiplier : recoveryStartOf(session);
        return Math.max(MIN_STAKE, Number(next.toFixed(2)));
    }
    return Number(session.stake.toFixed(2));
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

/**
 * Place one round for a session whose hour has already been claimed.
 * `barrier` is the digit the scan chose for this market; recovery rounds are
 * Even and ignore it.
 */
const placeRound = async (session, symbol, barrier) => {
    // A deficit carried from earlier losing rounds turns this hour into a
    // recovery round instead of a normal Differs round.
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

    // A round is a single contract either way now, but the shape is kept so the
    // per-call catch still turns a network failure into a recorded failed round
    // rather than an exception that leaves the in-flight flag set.
    const legs = isRecovery
        ? recoveryLegs(
              symbol,
              recoveryStartOf(session),
              Number(session.lastRecoveryStake) || 0,
              Number(session.recoveryMultiplier) || 2
          )
        : differsLegs(symbol, stake, barrier);
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
    const roundStake = legs[0].params.amount;

    const trade = {
        hourKey: session.lastHourKey,
        symbol,
        stake: roundStake,
        mode: isRecovery ? 'recovery' : 'differs',
        legs: placed,
        balanceBefore: balanceBefore ?? 0,
        profit: anyFilled ? null : 0,
        status: anyFilled ? 'open' : 'failed',
        reason: !anyFilled
            ? placed.map(l => l.error).filter(Boolean).join('; ') || 'Purchase failed'
            : isRecovery
              ? `Even ${roundStake} (martingale, ${deficit.toFixed(2)} owed)`
              : `Differs ${barrier} at ${roundStake}`,
        placedAt: new Date(),
        settledAt: anyFilled ? null : new Date(),
    };

    session.trades.push(trade);
    if (session.trades.length > MAX_TRADES_KEPT) {
        session.trades = session.trades.slice(-MAX_TRADES_KEPT);
    }
    // Remember the rung so the next retry can multiply from it.
    if (isRecovery && anyFilled) session.lastRecoveryStake = roundStake;
    if (anyFilled) {
        // Consecutive rounds never reuse a market. Only a round that actually
        // filled burns one — a rejected purchase leaves the market available.
        session.lastSymbol = symbol;
        // The two-odd wait is spent on the first rung of a ladder. Every retry
        // after this one goes straight in.
        if (isRecovery) session.recoveryWaitArmed = false;
    }
    // A round that never filled will never reach settlement, so release the
    // in-flight claim here or the session would stop trading permanently.
    if (!anyFilled) session.roundInFlight = false;
    await session.save();

    console.log(
        `[Printer] ${session.loginid} ${trade.status === 'failed' ? 'FAILED' : 'placed'} ` +
            `${isRecovery ? 'RECOVERY Even' : 'Differs'} on ${symbol} (${trade.reason})`
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
        const wasInRecovery = (Number(session.deficit) || 0) > 0;
        const deficit = (Number(session.deficit) || 0) - profit;
        session.deficit = Math.max(0, Number(deficit.toFixed(2)));

        // Opening a fresh ladder arms the two-odd wait for its first rung only.
        // Deepening one that is already open must not re-arm it — that is the
        // whole point of the wait applying once: a rung that loses is followed
        // immediately, not after another confirmation.
        if (!wasInRecovery && session.deficit > 0) session.recoveryWaitArmed = true;

        // Debt cleared — the ladder resets, so the next recovery starts at the
        // bottom rung instead of continuing from the last one.
        if (session.deficit === 0) {
            session.lastRecoveryStake = 0;
            session.recoveryWaitArmed = false;
        }
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

        // One fetch feeds every session's scan. The digit history is the same
        // for all of them; only the market each may use differs.
        const ticks = await fetchTickHistory(SYMBOLS, TICK_COUNT);

        for (const session of candidates) {
            // Selection is per session: each carries its own last-traded market
            // to skip, and its own ladder state.
            const isRecovery = (Number(session.deficit) || 0) > 0;
            const pick = isRecovery
                ? scanForRecovery(ticks, session.lastSymbol, Boolean(session.recoveryWaitArmed))
                : scanForDiffers(ticks, session.lastSymbol);

            // Nothing streaming, or an armed ladder still waiting on two odd
            // digits. Either way, hold and look again next pass — the hour is
            // not consumed and nothing is placed.
            if (!pick) continue;

            // Atomic claim on the in-flight flag: only the first caller gets the
            // document back, so a second instance or an overlapping pass cannot
            // place two rounds at once.
            const claimed = await PrinterSession.findOneAndUpdate(
                { _id: session._id, active: true, roundInFlight: false, hourDone: false },
                { $set: { roundInFlight: true }, $inc: { hourRounds: 1 } },
                { new: true }
            );
            if (!claimed) continue;

            await placeRound(claimed, pick.symbol, pick.barrier).catch(async err => {
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
    console.log('[Printer] Hourly Differs engine started (1-minute tick)');
    timer = setInterval(() => tick().catch(() => {}), TICK_MS);
    tick().catch(() => {});
};

module.exports = {
    start,
    tick,
    hourKeyNow,
    differsLegs,
    recoveryLegs,
    // Exported for inspection and testing — these hold the strategy's judgement.
    digitsOf,
    rarestDigit,
    endsWithTwoOdd,
    scanForDiffers,
    scanForRecovery,
};
