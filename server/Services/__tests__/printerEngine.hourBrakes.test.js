/**
 * The two brakes that end an hour early.
 *
 *   Green exit — a recovery round that wins while the session's net P/L is in
 *                profit stops the hour there, whatever is still owed.
 *   Last rung  — a loss at the ladder's cap stops the hour instead of staking
 *                the rung above it.
 *
 * Both end the hour, not the session, and both leave the deficit standing. The
 * recovery ladder is shared, so both strategies carry them.
 *
 * Plain Node, no framework and no network: Deriv's balance call is stubbed, so
 * a round's profit is whatever the stubbed balance says it is. Run with
 * `npm test`.
 */

const Module = require('module');
const path = require('path');

// ── Load the engine with its outbound dependencies stubbed ───────────────────

/** The account balance the next settlement will read. */
let balanceNow = 0;

const stubs = {
    './printerCrypto': { decryptToken: () => 'token' },
    './printerDeriv': {
        SYMBOLS: ['1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V'],
        fetchTickHistory: async () => ({}),
        fetchBalance: async () => balanceNow,
        purchaseContract: async () => ({}),
    },
    '../Models/PrinterSession': { findOneAndUpdate: async () => null, find: () => [] },
};

const realLoad = Module._load;
Module._load = function (request, ...rest) {
    if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
    return realLoad.call(this, request, ...rest);
};
const engine = require(path.join(__dirname, '..', 'printerEngine.js'));
Module._load = realLoad;

const { settleOpenRounds, recoveryCapOf, MAX_RECOVERY_RUNGS } = engine;

// ── Harness ──────────────────────────────────────────────────────────────────

let failures = 0;
const ok = (label, condition, detail = '') => {
    const suffix = condition || !detail ? '' : `  -> ${detail}`;
    console.log(`${condition ? 'ok   ' : 'FAIL '} ${label}${suffix}`);
    if (!condition) failures++;
};

const HOUR = '2026-10-03T10';
/** Old enough that settleOpenRounds considers it due. */
const longAgo = new Date(Date.now() - 60_000);

const makeSession = (over = {}) => ({
    loginid: 'TEST1',
    active: true,
    strategy: 'even',
    stake: 3,
    recoveryStartStake: 6,
    recoveryMultiplier: 2,
    deficit: 0,
    lastRecoveryStake: 0,
    lastRecoveryWon: false,
    recoveryLatched: false,
    recoveryWaitArmed: false,
    hourDone: false,
    hourEndedReason: '',
    hourlyProfit: 0,
    hourlyTarget: 0,
    lastHourKey: HOUR,
    takeProfit: 0,
    stopLoss: 0,
    tokenEnc: 'x',
    appId: 1,
    account_id: 'a',
    stats: { trades: 0, wins: 0, losses: 0, profit: 0 },
    trades: [],
    async save() {},
    ...over,
});

/**
 * Settles one round of `stake` that wins or loses, and returns the session.
 * Profit is driven through the balance, the way the engine actually reads it.
 */
const settleRound = async (session, { stake, won, mode = 'recovery', payout = 0.8182 }) => {
    const balanceBefore = 1000;
    const profit = won ? Number((stake * payout).toFixed(2)) : -stake;
    session.trades.push({
        hourKey: session.lastHourKey,
        symbol: '1HZ10V',
        stake,
        mode,
        status: 'open',
        placedAt: longAgo,
        balanceBefore,
        legs: [{ contract_id: 'c1' }],
    });
    balanceNow = balanceBefore + profit;
    await settleOpenRounds(session);
    return session;
};

// ── Tests ────────────────────────────────────────────────────────────────────

async function capIsDerivedFromTheSettings() {
    ok('cap is the fourth rung: 6 x 2^3 = 48',
        recoveryCapOf({ recoveryStartStake: 6, recoveryMultiplier: 2 }) === 48);
    ok('cap follows a different start stake: 10 x 2^3 = 80',
        recoveryCapOf({ recoveryStartStake: 10, recoveryMultiplier: 2 }) === 80);
    ok('cap follows a different multiplier: 6 x 3^3 = 162',
        recoveryCapOf({ recoveryStartStake: 6, recoveryMultiplier: 3 }) === 162);
    ok('the ladder is four rungs', MAX_RECOVERY_RUNGS === 4);
}

/** Rule A, on the exact hour from the screenshot. */
async function greenExitStopsTheHourOnAWinningRecovery() {
    // Up 250 from earlier hours, then this hour opens badly.
    const s = makeSession({ stats: { trades: 0, wins: 0, losses: 0, profit: 250 } });

    await settleRound(s, { stake: 3, won: false, mode: 'differs' });   // opening loss
    ok('opening loss does not end the hour', !s.hourDone, s.hourEndedReason);

    await settleRound(s, { stake: 6, won: false });                    // rung 1 loses
    ok('a losing recovery round does not end the hour', !s.hourDone, s.hourEndedReason);

    await settleRound(s, { stake: 12, won: true });                    // rung 2 wins
    ok('green exit: a winning recovery round ends the hour', s.hourDone, 'hour still open');
    ok('green exit: the reason names it', /net P\/L green/.test(s.hourEndedReason), s.hourEndedReason);
    ok('green exit: the session keeps running', s.stats.profit > 0);
}

/** The deficit is irrelevant — only net P/L decides. */
async function greenExitIgnoresAnOutstandingDeficit() {
    const s = makeSession({ stats: { trades: 0, wins: 0, losses: 0, profit: 250 }, deficit: 100 });
    await settleRound(s, { stake: 12, won: true });                    // pays down 9.82 of 100
    ok('green exit fires with a deficit still owed', s.hourDone, s.hourEndedReason);
    ok('the deficit is carried, not written off', s.deficit > 0, `deficit ${s.deficit}`);
}

/** Red sessions keep recovering: the brake is about protecting a profit. */
async function aWinningRecoveryWhileRedKeepsGoing() {
    const s = makeSession({ stats: { trades: 0, wins: 0, losses: 0, profit: -40 } });
    await settleRound(s, { stake: 12, won: true });
    ok('a winning recovery round while net P/L is red does NOT end the hour',
        !s.hourDone, s.hourEndedReason);
}

/** Rule B. */
async function aLossAtTheLastRungStopsTheHour() {
    const s = makeSession({ stats: { trades: 0, wins: 0, losses: 0, profit: -40 } });

    await settleRound(s, { stake: 24, won: false });   // rung 3
    ok('a loss below the cap does not end the hour', !s.hourDone, s.hourEndedReason);

    await settleRound(s, { stake: 48, won: false });   // rung 4 — the cap
    ok('last rung: a loss at the cap ends the hour', s.hourDone, 'hour still open');
    ok('last rung: the reason names it', /last rung/.test(s.hourEndedReason), s.hourEndedReason);
    ok('last rung: the deficit is carried into the next hour', s.deficit > 0, `deficit ${s.deficit}`);
}

/** The ladder is shared, so Differs carries both brakes too. */
async function differsGetsTheSameBrakes() {
    const green = makeSession({ strategy: 'differs', stats: { trades: 0, wins: 0, losses: 0, profit: 250 } });
    await settleRound(green, { stake: 12, won: true });
    ok('Differs: green exit ends the hour', green.hourDone, 'hour still open');
    ok('Differs: green exit names its reason', /net P\/L green/.test(green.hourEndedReason), green.hourEndedReason);

    const deep = makeSession({ strategy: 'differs', stats: { trades: 0, wins: 0, losses: 0, profit: -40 } });
    await settleRound(deep, { stake: 48, won: false });
    ok('Differs: a loss at the cap ends the hour', deep.hourDone, 'hour still open');
    ok('Differs: the cap reason names it', /last rung/.test(deep.hourEndedReason), deep.hourEndedReason);

    // An opening Differs round is not a ladder rung, so neither brake reads it.
    const opening = makeSession({ strategy: 'differs', stats: { trades: 0, wins: 0, losses: 0, profit: 250 } });
    await settleRound(opening, { stake: 48, won: false, mode: 'differs' });
    ok('Differs: an opening round at the cap stake does not end the hour', !opening.hourDone,
        opening.hourEndedReason);
}

/** A round settling after the roll must not kill the hour that followed it. */
async function aLateSettlementCannotEndTheNewHour() {
    const s = makeSession({ stats: { trades: 0, wins: 0, losses: 0, profit: 250 }, lastHourKey: '2026-10-03T11' });
    s.trades.push({
        hourKey: '2026-10-03T10',          // the hour before
        symbol: '1HZ10V', stake: 12, mode: 'recovery', status: 'open',
        placedAt: longAgo, balanceBefore: 1000, legs: [{ contract_id: 'c1' }],
    });
    balanceNow = 1000 + 9.82;
    await settleOpenRounds(s);
    ok('a round from the previous hour does not end the new one', !s.hourDone, s.hourEndedReason);
}

(async () => {
    await capIsDerivedFromTheSettings();
    await greenExitStopsTheHourOnAWinningRecovery();
    await greenExitIgnoresAnOutstandingDeficit();
    await aWinningRecoveryWhileRedKeepsGoing();
    await aLossAtTheLastRungStopsTheHour();
    await differsGetsTheSameBrakes();
    await aLateSettlementCannotEndTheNewHour();

    console.log(failures ? `\n${failures} failing` : '\nall passing');
    process.exit(failures ? 1 : 0);
})();
