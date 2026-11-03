/** Unit tests for the pure part of the growth profit reader. */
const assert = require('assert');
const { sumProfit, filterToApp } = require('../growthProfit');

// Nothing traded, nothing earned.
assert.strictEqual(sumProfit([]), 0);

// A row carries two prices and no profit field; profit is the difference.
assert.strictEqual(sumProfit([{ buy_price: 10, sell_price: 19.5 }]), 9.5);

// A loss subtracts.
assert.strictEqual(sumProfit([{ buy_price: 10, sell_price: 0 }]), -10);

// A win and an equal loss cancel.
assert.strictEqual(
    sumProfit([
        { buy_price: 10, sell_price: 0 },
        { buy_price: 5, sell_price: 15 },
    ]),
    0
);

// Floating point must not leak cents into the figure a reward is paid on.
assert.strictEqual(
    sumProfit([
        { buy_price: 0.1, sell_price: 0.3 },
        { buy_price: 0.1, sell_price: 0.2 },
    ]),
    0.3
);

// Missing or malformed prices count as zero rather than poisoning the sum.
assert.strictEqual(sumProfit([{ buy_price: undefined, sell_price: 5 }]), 5);
assert.strictEqual(sumProfit([{ buy_price: 'x', sell_price: 'y' }]), 0);

// ── filterToApp ──────────────────────────────────────────────────────────────
const rows = [
    { app_id: 1234, buy_price: 10, sell_price: 30 }, // ours
    { app_id: 9999, buy_price: 10, sell_price: 50 }, // DTrader, or another site
    { app_id: '1234', buy_price: 10, sell_price: 20 }, // ours, as a string
];

// Only this app's contracts survive, whichever type Deriv sent the id as.
assert.strictEqual(filterToApp(rows, 1234).length, 2);
assert.strictEqual(filterToApp(rows, '1234').length, 2);
assert.strictEqual(sumProfit(filterToApp(rows, 1234)), 30);

// Someone else's trades never count toward the challenge.
assert.strictEqual(sumProfit(filterToApp(rows, 9999)), 40);

// With no app id configured nothing matches: the challenge stalls at zero
// rather than paying out on trades placed somewhere else.
assert.strictEqual(filterToApp(rows, '').length, 0);
assert.strictEqual(filterToApp(rows, undefined).length, 0);
assert.strictEqual(sumProfit(filterToApp(rows, '')), 0);

// A row with no app_id at all is not ours.
assert.strictEqual(filterToApp([{ buy_price: 1, sell_price: 2 }], 1234).length, 0);

assert.strictEqual(filterToApp(undefined, 1234).length, 0);

console.log('growthProfit: all assertions passed');
