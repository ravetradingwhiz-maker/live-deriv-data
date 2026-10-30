/**
 * Adding a third product must not disturb the two already selling.
 *
 * This server sells Nexora and QuantumSyn to Deriv accounts, keyed by
 * loginid. NYX EA has no Deriv accounts at all — its customers sign up with
 * an email — so its tiers key on the email instead, and its `loginids` are
 * optional where everyone else's are required.
 *
 * Both of those are changes to shared code paths, which is the whole reason
 * for this file: the assertions that matter most are the ones about Nexora
 * and QuantumSyn still behaving exactly as they did.
 *
 * Plain Node, no database. Run with `npm test`.
 */

const path = require('path');

let failures = 0;
const ok = (label, cond, detail = '') => {
    console.log(`${cond ? 'ok   ' : 'FAIL '} ${label}${cond || !detail ? '' : `  -> ${detail}`}`);
    if (!cond) failures++;
};

const root = path.join(__dirname, '..', '..');
const { TIERS, productOf, tiersForProduct, isEmailKeyed } = require(path.join(root, 'config', 'tiers.js'));
const { createPaymentSchema, paystackInitSchema, mpesaInitSchema } = require(path.join(root, 'Middlewares', 'validation.js'));

/* ── the products stay apart ─────────────────────────────────────────────── */

ok('nexora still sells exactly its three',
    tiersForProduct('nexora').join(',') === 'alpha,quantum,apex', tiersForProduct('nexora').join(','));
ok('quantumsyn still sells exactly its one',
    tiersForProduct('quantumsyn').join(',') === 'quantumsyn', tiersForProduct('quantumsyn').join(','));
ok('nyx sells its three',
    tiersForProduct('nyx').join(',') === 'pro,elite,advanced', tiersForProduct('nyx').join(','));

ok('no nyx tier leaks into nexora', !tiersForProduct('nexora').some(t => ['pro', 'elite', 'advanced'].includes(t)));
ok('no nexora tier leaks into nyx', !tiersForProduct('nyx').some(t => ['alpha', 'quantum', 'apex'].includes(t)));
ok('an unknown product still sells nothing', tiersForProduct('nope').length === 0);

/* ── the ladder ──────────────────────────────────────────────────────────── */

ok('pro is the entry tier', TIERS.pro.rank === 1);
ok('elite outranks pro', TIERS.elite.rank > TIERS.pro.rank);
ok('advanced outranks elite', TIERS.advanced.rank > TIERS.elite.rank);
ok('the prices climb with the ladder',
    TIERS.pro.priceUSD < TIERS.elite.priceUSD && TIERS.elite.priceUSD < TIERS.advanced.priceUSD);
ok('and so do the durations',
    TIERS.pro.months < TIERS.elite.months && TIERS.elite.months < TIERS.advanced.months);

/* Ranks are only ever compared inside a product, so a collision across them
   is harmless — but it is worth saying out loud that one exists, because the
   moment someone compares two ranks without checking the product it bites. */
ok('ranks collide across products, which is why product is always filtered first',
    TIERS.pro.rank === TIERS.alpha.rank && productOf('pro') !== productOf('alpha'));

/* ── who needs a loginid ─────────────────────────────────────────────────── */

ok('nyx tiers are email-keyed', isEmailKeyed('pro') && isEmailKeyed('elite') && isEmailKeyed('advanced'));
ok('nexora tiers are not', !isEmailKeyed('alpha') && !isEmailKeyed('quantum') && !isEmailKeyed('apex'));
ok('quantumsyn is not', !isEmailKeyed('quantumsyn'));
ok('an unknown tier is not', !isEmailKeyed('nonsense'));

const refused = (schema, body) => Boolean(schema.validate(body).error);

/* The regression this file exists for: every existing caller still has to
   send loginids, exactly as before. */
for (const [name, schema, extra] of [
    ['crypto', createPaymentSchema, { payCurrency: 'usdt' }],
    ['card', paystackInitSchema, {}],
    ['mpesa', mpesaInitSchema, { phone: '0712345678' }],
]) {
    for (const tier of ['alpha', 'quantum', 'apex', 'quantumsyn']) {
        ok(`${name}: ${tier} without loginids is still refused`,
            refused(schema, { tier, email: 'a@b.com', ...extra }));
    }
    for (const tier of ['pro', 'elite', 'advanced']) {
        ok(`${name}: ${tier} without loginids is accepted`,
            !refused(schema, { tier, email: 'a@b.com', ...extra }));
    }
    ok(`${name}: a nyx order still needs an email`,
        refused(schema, { tier: 'pro', ...extra }));
    ok(`${name}: a nyx order still needs a real email`,
        refused(schema, { tier: 'pro', email: 'not-an-email', ...extra }));
}

/* An empty array is what a nyx order arrives with, and must be allowed; a
   nexora one sending the same is still refused. */
ok('nyx may send an empty loginids array',
    !refused(createPaymentSchema, { tier: 'pro', payCurrency: 'usdt', email: 'a@b.com', loginids: [] }));
ok('nexora may not',
    refused(createPaymentSchema, { tier: 'alpha', payCurrency: 'usdt', email: 'a@b.com', loginids: [] }));

/* And a nyx customer who does happen to have one may still send it. */
ok('nyx may send loginids anyway',
    !refused(createPaymentSchema, { tier: 'pro', payCurrency: 'usdt', email: 'a@b.com', loginids: ['CR1'] }));

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
