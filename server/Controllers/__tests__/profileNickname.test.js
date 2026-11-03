/**
 * Executes the profile handlers with Deriv and Mongo stubbed.
 *
 * The point of interest is the ownership check: Deriv loginids are guessable,
 * so a write that trusted the body would let anyone rename anyone.
 */
const assert = require('assert');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const stub = (relative, exports) => {
    const resolved = require.resolve(path.join(ROOT, relative));
    require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
};

let written = null;
let ownedAccounts = [{ account_id: 'ROT91839961' }, { account_id: 'DOT93139383' }];
let stored = { nickname: 'Ryan', loginids: ['ROT91839961'] };

stub('Models/Profile', {
    findOne: async () => stored,
    findOneAndUpdate: async (_q, update) => {
        written = update.$set.nickname;
        return { nickname: written };
    },
});
stub('Services/printerDeriv', {
    getAppId: () => 'app',
    fetchAccounts: async () => ownedAccounts,
});

const controller = require(path.join(ROOT, 'Controllers/profileController'));

const run = async (handler, req) => {
    let payload = null;
    let failure = null;
    const res = { json: body => (payload = body) };
    await handler(req, res, err => (failure = err));
    return { payload, failure };
};

(async () => {
    // ── get ──────────────────────────────────────────────────────────────────
    const got = await run(controller.get, { query: { loginids: 'ROT91839961,DOT93139383' } });
    assert.strictEqual(got.failure, null, got.failure && got.failure.message);
    assert.strictEqual(got.payload.nickname, 'Ryan');

    // No loginids is not an error — it is simply nobody.
    const none = await run(controller.get, { query: {} });
    assert.strictEqual(none.payload.nickname, null);

    /* A name that was never set must come back as null, not undefined: the
       client only shows its mandatory prompt on a positive "none", so an
       ambiguous answer would trap a user who already has one. */
    stored = null;
    const missing = await run(controller.get, { query: { loginids: 'ROT91839961' } });
    assert.strictEqual(missing.payload.nickname, null);

    // ── setNickname ──────────────────────────────────────────────────────────
    const body = { loginids: ['ROT91839961'], accessToken: 'stub-token', nickname: 'Ryan' };
    const saved = await run(controller.setNickname, { body });
    assert.strictEqual(saved.failure, null, saved.failure && saved.failure.message);
    assert.strictEqual(saved.payload.nickname, 'Ryan');
    assert.strictEqual(written, 'Ryan');

    // Renaming an account the token does not own is refused.
    written = null;
    ownedAccounts = [{ account_id: 'SOMEONE_ELSE' }];
    const forbidden = await run(controller.setNickname, { body });
    assert.ok(forbidden.failure, 'a loginid the token does not own must be refused');
    assert.strictEqual(forbidden.failure.status, 403);
    assert.strictEqual(written, null, 'nothing is written when ownership fails');

    // A rejected token is the caller's fault, not a server fault.
    ownedAccounts = [{ account_id: 'ROT91839961' }];
    stub('Services/printerDeriv', {
        getAppId: () => 'app',
        fetchAccounts: async () => {
            const err = new Error('Invalid token');
            err.status = 401;
            throw err;
        },
    });
    delete require.cache[require.resolve(path.join(ROOT, 'Controllers/profileController'))];
    const rejecting = require(path.join(ROOT, 'Controllers/profileController'));
    const unauthorised = await run(rejecting.setNickname, { body });
    assert.ok(unauthorised.failure);
    assert.strictEqual(unauthorised.failure.status, 401);

    // An empty nickname is rejected before Deriv is ever asked.
    const blank = await run(rejecting.setNickname, { body: { ...body, nickname: '   ' } });
    assert.ok(blank.failure);
    assert.strictEqual(blank.failure.status, 400);

    console.log('profileNickname: all assertions passed');
})().catch(err => {
    console.error(err);
    process.exit(1);
});
