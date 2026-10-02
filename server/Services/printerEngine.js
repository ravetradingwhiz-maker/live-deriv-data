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

/**
 * How often the loop looks for work.
 *
 * This is dead time, not pacing: a round settles and then waits for the next
 * pass before the following one is placed. At fifteen seconds that idle stretch
 * was longer than a 1-tick round takes to settle, so a session spent more of
 * each cycle waiting than trading. Five keeps the gap short without turning the
 * balance check into a poll — the pass exits immediately when no session is
 * ready, and the tick history is only fetched when one is.
 */
const TICK_MS = 5 * 1000;
const TICK_COUNT = 200; // the window the Differs barrier scan ranks digits over
/**
 * How much history each pass pulls.
 *
 * Sized by the deepest reader, which is the recovery gate's even-dominance
 * check. Everything else slices the tail it wants out of this, so widening it
 * here does not change what Differs ranks.
 */
const HISTORY_COUNT = 500;
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
        // The ranking window, not the whole history the pass now carries.
        ...rarestDigit(market.digits.slice(-TICK_COUNT)),
    }));
    if (!scored.length) return null;

    scored.sort((a, b) => a.share - b.share);
    return scored[0];
};

/** How many ticks the even-dominance check reads. */
const DOMINANCE_SAMPLE = 500;

/**
 * Share of the window that must be even before a recovery round is let in.
 *
 * Half means a plain majority — more evens than odds — which is what
 * "dominating" asks for. Raise it to demand a clearer lean: over a 500-tick
 * window the even share sits within about two points of 0.50 most of the time,
 * so 0.52 is roughly a one-in-five pass and 0.54 a rare one.
 */
const MIN_EVEN_SHARE = 0.5;

/**
 * Fraction of the last DOMINANCE_SAMPLE digits that are even.
 *
 * Reads the tail of whatever history it is given, so a market returning fewer
 * than the full window is measured on what it has rather than being failed for
 * it — `usableMarkets` has already guaranteed a floor of MIN_SAMPLE.
 */
const evenShare = digits => {
    const window = digits.slice(-DOMINANCE_SAMPLE);
    if (!window.length) return 0;
    let evens = 0;
    for (const digit of window) if (digit % 2 === 0) evens += 1;
    return evens / window.length;
};

/** Are evens dominating the recent stream? */
const evensDominate = digits => evenShare(digits) > MIN_EVEN_SHARE;

/**
 * Market for an opening Even round.
 *
 * The market does not rotate: `usableMarkets` is asked to exclude nothing and
 * the list is in a fixed order, so a session stays on one market instead of
 * moving between them the way Differs does.
 *
 * That market must show evens leading its last DOMINANCE_SAMPLE ticks before a
 * round opens — the same read the recovery gate uses, so both ends of the
 * strategy agree about what counts as an even-leaning stream. Null means hold
 * and look again next pass.
 *
 * Note this holds rather than rotates: because the market is fixed, an opening
 * round waits out an odd-leaning stretch on that market instead of stepping to
 * one already leaning even.
 */
const scanForEven = ticksBySymbol => {
    const market = usableMarkets(ticksBySymbol)[0] ?? null;
    if (!market) return null;
    return evensDominate(market.digits) ? market : null;
};

/** Opening round for the Even strategy: one Even contract at the base stake. */
const evenLegs = (symbol, stake) => [digitLeg(symbol, stake, 'DIGITEVEN')];

/** Are the two most recent digits both odd? History is oldest first. */
const endsWithTwoOdd = digits =>
    digits.length >= 2 && digits[digits.length - 1] % 2 === 1 && digits[digits.length - 2] % 2 === 1;

/**
 * Market for a recovery Even: the one the losing round was placed on.
 *
 * A ladder stays where it started, whichever strategy opened it. It used to do
 * the opposite — the market that had just lost was the one market excluded —
 * so a ladder walked away from the loss and could end up spread across several
 * markets before it was paid off.
 *
 * The wait is therefore read on that market and no other. The first rung holds
 * until the pinned market both ends on two odd digits and shows evens
 * dominating its last DOMINANCE_SAMPLE ticks; every rung after it goes straight
 * in. Null means hold and look again next pass — either the market is not
 * streaming enough history, or the wait is not satisfied yet.
 *
 * Pinning narrows the wait from "any of ten markets shows two odds" to "this
 * one does", so a first rung can sit for noticeably longer than it used to.
 * That is the intended trade: the ladder recovers where it lost. The dominance
 * half narrows it again — both conditions must hold on the same pass, so a
 * first rung can now wait through two-odd endings that arrive while the wider
 * window is odd-leaning.
 */
const scanForRecovery = (ticksBySymbol, pinnedSymbol, mustWaitForTwoOdd) => {
    const markets = usableMarkets(ticksBySymbol);
    if (!markets.length) return null;

    /* No pinned market means no round has filled yet, which a ladder cannot
       reach — guarded anyway so a ladder can never be stranded with nothing to
       trade on. */
    const market = pinnedSymbol ? markets.find(m => m.symbol === pinnedSymbol) : markets[0];
    if (!market) return null;

    /* Both halves of the wait, on the pinned market: the two-odd ending that
       was already here, and the wider read that evens are ahead over the last
       few hundred ticks. */
    if (mustWaitForTwoOdd) {
        if (!endsWithTwoOdd(market.digits)) return null;
        if (!evensDominate(market.digits)) return null;
    }
    return market;
};

// ── Rounds ───────────────────────────────────────────────────────────────────

/**
 * Is this session placing a recovery round rather than its opening trade?
 *
 * A deficit means recovery for either strategy. Even carries a second reason:
 * once a loss has put it into recovery, it stays there for the rest of the hour
 * even after the deficit is paid off, so the hour is finished on recovery stakes
 * instead of returning to the opening trade.
 *
 * One helper because two places ask — the scan in tick() and the legs in
 * placeRound() — and they must never disagree about which kind of round this is.
 */
const inRecovery = session =>
    (Number(session.deficit) || 0) > 0 ||
    (session.strategy === 'even' && Boolean(session.recoveryLatched));

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
 *   first attempt     → recoveryStartStake (its own setting, not the base stake)
 *   retry after a loss → previous recovery stake x multiplier
 *   retry after a win  → previous recovery stake, unchanged (Even only)
 *
 * The ladder climbs only on a loss. A rung that wins stays where it is until
 * one loses, so a session that recovers at 24 keeps trading 24 rather than
 * doubling into 48 off the back of a win.
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
const recoveryLegs = (symbol, startStake, lastRecoveryStake = 0, multiplier = 2, holdStake = false) => {
    const next =
        lastRecoveryStake > 0
            ? holdStake
                ? lastRecoveryStake
                : lastRecoveryStake * multiplier
            : startStake;
    const stake = Math.max(MIN_STAKE, Number(next.toFixed(2)));
    return [digitLeg(symbol, stake, 'DIGITEVEN')];
};

/**
 * Does the next recovery round hold its stake rather than climb?
 *
 * Whenever the round before it won, on either strategy — the ladder is shared,
 * so it climbs on losses and holds on wins the same way whichever opening round
 * put the session into it.
 *
 * One helper because the stake and the balance check both ask, and they must
 * never disagree about how big the next round is.
 */
const holdsRecoveryStake = session => Boolean(session.lastRecoveryWon);

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
        const climbed = holdsRecoveryStake(session) ? last : last * multiplier;
        const next = last > 0 ? climbed : recoveryStartOf(session);
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
    const isRecovery = inRecovery(session);

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
              Number(session.recoveryMultiplier) || 2,
              holdsRecoveryStake(session)
          )
        : session.strategy === 'even'
          ? evenLegs(symbol, stake)
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
        // What the next round reads: Differs skips this market, a recovery
        // ladder stays on it. Only a round that actually filled records one — a
        // rejected purchase leaves the previous market standing.
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

        /* How this recovery round ended decides the next one's stake: a win
           holds the rung, a loss climbs from it. Read from the trade rather
           than the deficit, which cannot answer it — a winning rung usually
           leaves a remainder owed, so a standing deficit says nothing about
           whether the round that just settled won. */
        if (trade.mode === 'recovery') session.lastRecoveryWon = profit >= 0;

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

        /* Even stays in recovery once it has been there, for the rest of the
           hour. Set here rather than where the deficit clears, because by then
           the reason for latching has already gone. */
        if (session.strategy === 'even' && session.deficit > 0) session.recoveryLatched = true;

        /* Debt cleared. Differs leaves recovery here and goes back to its
           opening round, so there is no next rung to hold and its ladder
           resets — the one after it opens at recoveryStartStake. Even is
           latched and keeps trading recovery rounds for the rest of the hour,
           so it holds the rung that won rather than dropping back to the
           opening one; the hour roll is what clears that — see rollHour.

           Holding a winning rung *within* a ladder is shared by both; this is
           only about what happens once the debt is gone. */
        if (session.deficit === 0) {
            if (session.strategy !== 'even') session.lastRecoveryStake = 0;
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
        // A new hour starts on the opening trade, whatever last hour ended on —
        // at the configured stake, and with the ladder back at its opening rung
        // rather than wherever Even was holding when the hour ran out.
        session.recoveryLatched = false;
        session.lastRecoveryStake = 0;
        session.lastRecoveryWon = false;
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
        const ticks = await fetchTickHistory(SYMBOLS, HISTORY_COUNT);

        for (const session of candidates) {
            // Selection is per session: each carries its own last-traded market
            // to skip, and its own ladder state.
            const isRecovery = inRecovery(session);
            /* Recovery is the same for both strategies; only the opening round
               differs. Even takes the first streaming market and buys, so it
               only ever returns null when nothing is streaming at all. */
            const pick = isRecovery
                // lastSymbol PINS the ladder here; for Differs below it excludes.
                ? scanForRecovery(ticks, session.lastSymbol, Boolean(session.recoveryWaitArmed))
                : session.strategy === 'even'
                  ? scanForEven(ticks)
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
    evenShare,
    evensDominate,
    scanForEven,
    scanForDiffers,
    scanForRecovery,
};
