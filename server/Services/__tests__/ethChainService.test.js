/**
 * Tests the USDC reader against stubbed Etherscan responses.
 *
 * Two of these guard mistakes that would cost real money: reading the amount
 * at the wrong number of decimals, and comparing Ethereum addresses by case.
 */
const assert = require('assert');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

let lastParams = null;
let reply = null;
let calls = 0;

const axiosPath = require.resolve('axios');
require.cache[axiosPath] = {
    id: axiosPath,
    filename: axiosPath,
    loaded: true,
    exports: {
        get: async (_url, cfg) => {
            calls += 1;
            lastParams = cfg.params;
            return { data: reply };
        },
    },
};

process.env.ETHERSCAN_API_KEY = 'stub-key';
const { getIncomingUsdc, USDC_DECIMALS, resetGate } = require(path.join(ROOT, 'Services/ethChainService'));

/* The reader holds an answer for a few seconds so a sweep of pending orders
   does not ask the same question once per order. Each case below stubs a
   different answer for the same address, so each one starts from empty. */
const fresh = () => {
    resetGate();
    calls = 0;
};

const ADDRESS = '0xAbC0000000000000000000000000000000000001';
const NOW = 1764000000000;

const row = (over = {}) => ({
    hash: '0xtx1',
    from: '0x9999999999999999999999999999999999999999',
    to: ADDRESS.toLowerCase(),
    value: '104370000', // 104.37 at 6 decimals
    tokenDecimal: '6',
    timeStamp: String(Math.floor(NOW / 1000)),
    ...over,
});

(async () => {
    // USDC is 6 decimals. Reading 104370000 as 18 would give 0.0000000001.
    assert.strictEqual(USDC_DECIMALS, 6);
    fresh();
    reply = { status: '1', result: [row()] };
    let out = await getIncomingUsdc(ADDRESS, NOW);
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0].amount, 104.37, 'amount must be read at the row\'s decimals');

    // The request must ask for the right chain and contract.
    assert.strictEqual(lastParams.action, 'tokentx');
    assert.strictEqual(lastParams.chainid, '1');
    assert.ok(/^0x/.test(lastParams.contractaddress));

    /* Ethereum addresses are case-insensitive hex. Etherscan returns them
       lowercased while a checksummed address has mixed case, so comparing
       them literally would discard every payment made to our own wallet. */
    fresh();
    reply = { status: '1', result: [row({ to: ADDRESS })] };
    out = await getIncomingUsdc(ADDRESS, NOW);
    assert.strictEqual(out.length, 1, 'a checksum-cased address is the same address');

    // A transfer to somebody else is not ours.
    fresh();
    reply = { status: '1', result: [row({ to: '0xdeadbeef00000000000000000000000000000000' })] };
    assert.strictEqual((await getIncomingUsdc(ADDRESS, NOW)).length, 0);

    // Older than the window, beyond the back-buffer.
    fresh();
    reply = { status: '1', result: [row({ timeStamp: String(Math.floor((NOW - 600000) / 1000)) })] };
    assert.strictEqual((await getIncomingUsdc(ADDRESS, NOW)).length, 0);

    // An empty history is normal, not a fault.
    fresh();
    reply = { status: '0', message: 'No transactions found', result: [] };
    assert.deepStrictEqual(await getIncomingUsdc(ADDRESS, NOW), []);

    /* A rate limit also answers 200 with status "0". Swallowing it as "no
       payment" would leave a paid order pending for ever, so it throws and
       the caller logs and retries. */
    fresh();
    reply = { status: '0', message: 'NOTOK', result: 'Max rate limit reached' };
    await assert.rejects(() => getIncomingUsdc(ADDRESS, NOW), /rate limit/i);

    // No address configured is not a query.
    fresh();
    assert.deepStrictEqual(await getIncomingUsdc('', NOW), []);
    assert.strictEqual(calls, 0, 'no address is not a request');

    /* The sweep walks every pending order in a row, and they all share one
       deposit address. Asking once per order is what exhausted the free tier,
       so the second and third callers must be answered from the first's reply
       rather than from Etherscan. */
    fresh();
    reply = { status: '1', result: [row()] };
    const sweep = [
        await getIncomingUsdc(ADDRESS, NOW),
        await getIncomingUsdc(ADDRESS, NOW),
        await getIncomingUsdc(ADDRESS, NOW),
    ];
    assert.strictEqual(calls, 1, 'one address, one request');
    for (const result of sweep) assert.strictEqual(result.length, 1, 'every caller still gets the answer');

    // Callers that arrive together share the one request in flight.
    fresh();
    await Promise.all([getIncomingUsdc(ADDRESS, NOW), getIncomingUsdc(ADDRESS, NOW)]);
    assert.strictEqual(calls, 1, 'concurrent callers share a request');

    /* A rate limit is a wait, not an answer: it is retried before it is handed
       back. Giving up on the first one is how an order that was paid for sat
       pending until it expired. */
    fresh();
    reply = { status: '0', message: 'NOTOK', result: 'Max rate limit reached' };
    await assert.rejects(() => getIncomingUsdc(ADDRESS, NOW), /rate limit/i);
    assert.strictEqual(calls, 2, 'a rate limit is retried once');

    // A failure is not cached — the next caller gets a real attempt.
    reply = { status: '1', result: [row()] };
    assert.strictEqual((await getIncomingUsdc(ADDRESS, NOW)).length, 1, 'a failure leaves nothing cached');

    console.log('ethChainService: all assertions passed');
})().catch(err => {
    console.error(err);
    process.exit(1);
});
