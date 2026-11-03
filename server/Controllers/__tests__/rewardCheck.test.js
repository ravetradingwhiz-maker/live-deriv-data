/**
 * Executes the reward handlers end to end with Deriv and Mongo stubbed.
 *
 * `node --check` only parses; it cannot see that a handler references a name
 * nothing bound. That exact bug — a log line reading `loginids` where it was
 * never destructured — reached the running server twice, each time turning
 * every check into a 500. These tests call the handlers for real, so the next
 * one fails here instead.
 */
const assert = require('assert');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

/** Puts a stub in the require cache so the controller picks it up. */
const stub = (relative, exports) => {
    const resolved = require.resolve(path.join(ROOT, relative));
    require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
};

const LADDER = {
    _id: 'ladder-1',
    loginids: ['ROT91839961', 'DOT93139383'],
    startedAt: new Date('2026-11-03T14:48:05.377Z'),
    threshold: 500,
    grantsClaimed: 0,
};

let capturedSince = null;
let createdSubscription = null;
let backfilled = null;

// Mirrors the driver's includeResultMetadata shape, so the controller's
// "did this call enrol the account?" branch is exercised rather than skipped.
stub('Models/GrowthReward', {
    findOneAndUpdate: async () => ({
        value: { ...LADDER },
        lastErrorObject: { updatedExisting: true },
    }),
    updateOne: async (_q, update) => (backfilled = update.$set.startedAt),
});
stub('Models/Subscription', {
    create: async doc => {
        createdSubscription = doc;
        return doc;
    },
});
stub('Services/growthProfit', {
    fetchChallengeProfit: async (_token, _loginid, since) => {
        capturedSince = since;
        return {
            profit: 620.5,
            rowsSeen: 12,
            buyRows: 6,
            sellRows: 6,
            ourBuys: 6,
            matched: 6,
            appIdsSeen: ['34exZ7nvTvqPT4MhZLRYw'],
            lookingFor: '34exZ7nvTvqPT4MhZLRYw',
        };
    },
});

const controller = require(path.join(ROOT, 'Controllers/rewardController'));

const BODY = { loginids: ['ROT91839961', 'DOT93139383'], accessToken: 'stub-token' };

const run = async handler => {
    let payload = null;
    let failure = null;
    const res = { json: body => (payload = body) };
    await handler({ body: BODY }, res, err => (failure = err));
    return { payload, failure };
};

(async () => {
    // ── check ────────────────────────────────────────────────────────────────
    const checked = await run(controller.check);

    // The bug this file exists for: an unbound name in the handler surfaces as
    // an error handed to next(), not as a response.
    assert.strictEqual(
        checked.failure,
        null,
        `check() failed instead of responding: ${checked.failure && checked.failure.message}`
    );
    assert.ok(checked.payload, 'check() sent no response body');
    assert.strictEqual(checked.payload.profit, 620.5);
    assert.strictEqual(checked.payload.threshold, 500);
    assert.strictEqual(checked.payload.claimable, true, '620.50 clears a 500 target');
    // An account already enrolled must not be enrolled again, or the ladder
    // resets on every call and the reward can be claimed without limit.
    assert.strictEqual(
        checked.payload.threshold,
        500,
        'an existing ladder row is reused, not replaced'
    );

    // The window opens at midnight on the enrolment day, not at the instant the
    // row was written — 14:48 on the 3rd must read back as 00:00 on the 3rd.
    assert.strictEqual(
        new Date(capturedSince * 1000).toISOString(),
        '2026-11-03T00:00:00.000Z',
        'the read must be windowed to the start of the enrolment day'
    );

    // Checking must never grant: the reward is claimed by hand.
    assert.strictEqual(createdSubscription, null, 'check() must not write a subscription');

    // ── claim ────────────────────────────────────────────────────────────────
    // The ladder bumps conditionally, so give it a row that matches.
    stub('Models/GrowthReward', {
        findOneAndUpdate: async (_query, update) =>
            update && update.$setOnInsert
                ? { value: { ...LADDER }, lastErrorObject: { updatedExisting: true } }
                : { ...LADDER, threshold: 1000, grantsClaimed: 1 }, // the ladder bump
    });
    delete require.cache[require.resolve(path.join(ROOT, 'Controllers/rewardController'))];
    const fresh = require(path.join(ROOT, 'Controllers/rewardController'));

    const claimed = await run(fresh.claim);
    assert.strictEqual(
        claimed.failure,
        null,
        `claim() failed instead of responding: ${claimed.failure && claimed.failure.message}`
    );
    assert.strictEqual(claimed.payload.granted, true);
    assert.strictEqual(claimed.payload.threshold, 1000, 'the target doubles after a grant');
    assert.ok(createdSubscription, 'claim() writes the subscription');
    assert.strictEqual(createdSubscription.tier, 'alpha');
    assert.strictEqual(createdSubscription.paymentId, 'reward:growth:1');

    // ── a row written before startedAt existed ───────────────────────────────
    // Its enrolment time is createdAt. Reading it as "now" would slide the
    // window forward every midnight and reset the challenge nightly.
    capturedSince = null;
    backfilled = null;
    stub('Models/GrowthReward', {
        findOneAndUpdate: async () => ({
            value: {
                _id: 'ladder-legacy',
                loginids: LADDER.loginids,
                createdAt: new Date('2026-10-28T09:12:00.000Z'),
                threshold: 500,
                grantsClaimed: 0,
            },
            lastErrorObject: { updatedExisting: true },
        }),
        updateOne: async (_q, update) => (backfilled = update.$set.startedAt),
    });
    delete require.cache[require.resolve(path.join(ROOT, 'Controllers/rewardController'))];
    const legacy = require(path.join(ROOT, 'Controllers/rewardController'));

    const legacyChecked = await run(legacy.check);
    assert.strictEqual(legacyChecked.failure, null);
    assert.strictEqual(
        new Date(capturedSince * 1000).toISOString(),
        '2026-10-28T00:00:00.000Z',
        'a row with no startedAt is windowed from createdAt, not from now'
    );
    assert.ok(backfilled, 'the missing startedAt is written back');
    assert.strictEqual(
        new Date(backfilled).toISOString(),
        '2026-10-28T00:00:00.000Z',
        'the backfilled value is the start of the enrolment day'
    );

    console.log('rewardCheck: all assertions passed');
})().catch(err => {
    console.error(err);
    process.exit(1);
});
