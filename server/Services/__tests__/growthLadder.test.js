/** Unit tests for the growth reward ladder rule. */
const assert = require('assert');
const { nextThreshold, shouldGrant } = require('../../Controllers/rewardController');

// Each grant doubles the bar.
assert.strictEqual(nextThreshold(500), 1000);
assert.strictEqual(nextThreshold(1000), 2000);
assert.strictEqual(nextThreshold(2000), 4000);

// Just short does not pay.
assert.strictEqual(shouldGrant(499.99, 500), false);

// Exactly on the bar pays.
assert.strictEqual(shouldGrant(500, 500), true);

// Well past the bar pays once — the ladder moves one rung per call, so a
// trader who jumped straight to 5000 still has 1000 ahead of them.
assert.strictEqual(shouldGrant(5000, 500), true);
assert.strictEqual(nextThreshold(500), 1000);

// A losing account is nowhere near it.
assert.strictEqual(shouldGrant(-200, 500), false);
assert.strictEqual(shouldGrant(0, 500), false);

console.log('growthLadder: all assertions passed');
