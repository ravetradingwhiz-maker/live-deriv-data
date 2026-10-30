/**
 * A receipt must name the product that was actually bought.
 *
 * One server sells three, and every email it sent said "Nexora AI" whatever
 * was on the order — so a QuantumSyn customer was thanked by name for a
 * product they had never heard of and told to log in somewhere they have no
 * account. A NYX EA customer would have had the same.
 *
 * The assertion that matters most is the negative one: no receipt may
 * mention a brand other than its own. Getting the right name in is easy;
 * leaving the wrong one behind in a footer is how this happened.
 *
 * Plain Node, no network. Run with `npm test`.
 */

const path = require('path');

let failures = 0;
const ok = (label, cond, detail = '') => {
    console.log(`${cond ? 'ok   ' : 'FAIL '} ${label}${cond || !detail ? '' : `  -> ${detail}`}`);
    if (!cond) failures++;
};

const root = path.join(__dirname, '..', '..');
const { buildReceipt } = require(path.join(root, 'Services', 'emailService.js'));
const { BRANDS } = require(path.join(root, 'config', 'products.js'));
const { TIERS, productOf } = require(path.join(root, 'config', 'tiers.js'));

const make = tier =>
    buildReceipt({
        tier,
        expiresAt: new Date('2026-12-25T00:00:00Z'),
        priceUSD: 270,
        payCurrency: 'usdt',
        orderId: 'ORD-123',
    });

/* Every tier the server sells, against the brand it belongs to. */
for (const tier of Object.keys(TIERS)) {
    const product = productOf(tier);
    const mine = BRANDS[product];
    const r = make(tier);

    ok(`${tier}: addressed from ${mine.name}`, r.brand.name === mine.name, r.brand.name);
    ok(`${tier}: the subject names ${mine.name}`, r.subject.includes(mine.name), r.subject);
    ok(`${tier}: the heading names ${mine.name}`, r.html.includes(`>${mine.name} `), 'heading missing');
    ok(`${tier}: the footer names ${mine.name}`, r.html.includes(`${mine.name}. Need help?`), 'footer missing');
    ok(`${tier}: says what the access is`, r.html.includes(mine.accessLine), 'access line missing');

    /* The whole point. A receipt that mentions somebody else's brand is the
       bug this file exists to catch. */
    for (const [other, brand] of Object.entries(BRANDS)) {
        if (other === product) continue;
        ok(`${tier}: never mentions ${brand.name}`,
            !r.subject.includes(brand.name) && !r.html.includes(brand.name),
            `${brand.name} leaked in`);
        ok(`${tier}: never carries ${other}'s access line`, !r.html.includes(brand.accessLine));
    }
}

/* The facts on the order still have to survive the templating. */
const r = make('elite');
ok('the plan is on the receipt', r.html.includes('Elite'));
ok('the price is on the receipt', r.html.includes('270 USD'));
ok('the currency is on the receipt', r.html.includes('USDT'));
ok('the order number is on the receipt', r.html.includes('ORD-123'));
ok('the expiry is on the receipt', /December/.test(r.html), 'date missing');

/* NYX EA's customers have no Deriv logins, so its receipt must not claim
   anything is unlocked for them. */
ok('a nyx receipt does not promise logins it has none of',
    !make('pro').html.includes('all logins on your account'),
    make('pro').html.match(/<p style="color:#94a3b8;">[^<]*<\/p>/g)?.join(' | ') ?? '');

ok('a nexora receipt still does', make('alpha').html.includes('all logins on your account'));

/* An unknown tier must still produce a sendable email rather than throwing
   mid-payment, after the money has been taken. */
const odd = make('not-a-tier');
ok('an unknown tier still builds a receipt', Boolean(odd.subject && odd.html));
ok('and falls back to the server’s own brand', odd.brand.name === BRANDS.nexora.name, odd.brand.name);

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
