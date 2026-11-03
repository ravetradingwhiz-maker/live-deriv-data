/** Unit tests for the pure part of the growth profit reader. */
const assert = require('assert');
const { sumProfit } = require('../growthProfit');

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

console.log('growthProfit: all assertions passed');
