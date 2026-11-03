/** Unit tests for the pure part of the challenge profit reader. */
const assert = require('assert');
const { realisedProfit } = require('../growthProfit');

const OURS = '34exZ7nvTvqPT4MhZLRYw';
const THEIRS = 'someOtherAppId';

const buy = (contract_id, amount, app_id = OURS) => ({
    action_type: 'buy',
    contract_id,
    amount: -amount, // a buy debits the account
    app_id,
});
const sell = (contract_id, amount) => ({ action_type: 'sell', contract_id, amount, app_id: null });

// Nothing traded, nothing earned.
assert.strictEqual(realisedProfit([], OURS), 0);
assert.strictEqual(realisedProfit(undefined, OURS), 0);

// A won contract: proceeds less the stake.
assert.strictEqual(realisedProfit([buy(1, 10), sell(1, 19.5)], OURS), 9.5);

// A lost contract settles at zero, so the stake is the loss.
assert.strictEqual(realisedProfit([buy(2, 10), sell(2, 0)], OURS), -10);

// A win and an equal loss cancel.
assert.strictEqual(realisedProfit([buy(1, 10), sell(1, 20), buy(2, 10), sell(2, 0)], OURS), 0);

// Bought in DTrader or on another site: never counts, even though its sell
// row is in the same statement.
assert.strictEqual(realisedProfit([buy(3, 10, THEIRS), sell(3, 50)], OURS), 0);

// Ours and theirs together: only ours is counted.
assert.strictEqual(realisedProfit([buy(1, 10), sell(1, 30), buy(3, 10, THEIRS), sell(3, 999)], OURS), 20);

// Still open — a buy with no sell yet. Skipped, not counted as a total loss,
// or holding a position would drag the challenge negative.
assert.strictEqual(realisedProfit([buy(4, 25)], OURS), 0);
assert.strictEqual(realisedProfit([buy(1, 10), sell(1, 30), buy(4, 25)], OURS), 20);

// A sell whose buy predates the window has nothing to attribute it to.
assert.strictEqual(realisedProfit([sell(5, 80)], OURS), 0);

// Deposits and withdrawals are not trades.
assert.strictEqual(
    realisedProfit([{ action_type: 'deposit', contract_id: null, amount: 500, app_id: OURS }], OURS),
    0
);

// Sign convention is not relied on: magnitudes are used, so a positively
// signed buy gives the same answer.
assert.strictEqual(
    realisedProfit([{ action_type: 'buy', contract_id: 6, amount: 10, app_id: OURS }, sell(6, 19.5)], OURS),
    9.5
);

// Floating point must not leak cents into the figure a reward is paid on.
assert.strictEqual(realisedProfit([buy(7, 0.1), sell(7, 0.3), buy(8, 0.1), sell(8, 0.2)], OURS), 0.3);

// With no app id configured nothing matches: the challenge stalls at zero
// rather than paying out on trades placed somewhere else.
assert.strictEqual(realisedProfit([buy(1, 10), sell(1, 999)], ''), 0);
assert.strictEqual(realisedProfit([buy(1, 10), sell(1, 999)], undefined), 0);

// A buy with no app id at all is not ours.
assert.strictEqual(
    realisedProfit([{ action_type: 'buy', contract_id: 9, amount: -10 }, sell(9, 99)], OURS),
    0
);

console.log('growthProfit: all assertions passed');
