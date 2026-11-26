const axios = require('axios');
const { createGate } = require('./explorerGate');

const TRONGRID = 'https://api.trongrid.io';
// Official Tether USDT TRC-20 contract on TRON mainnet.
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

/**
 * How far back a request reaches.
 *
 * Fixed rather than taken from the caller's own window: an order's window
 * starts when that order was opened, and a request shaped around one order's
 * start cannot answer for any other. One request covering the longest an order
 * can live answers for all of them, and each caller filters it down to its own
 * window afterwards.
 */
const LOOKBACK_MS = 70 * 60 * 1000;

/**
 * TronGrid rate-limits by key, and the order sweep asks about every pending
 * order in a row — all of them about the same deposit address.
 */
const gate = createGate({
    minGapMs: Number(process.env.TRONGRID_MIN_GAP_MS) || 400,
    cacheMs: Number(process.env.TRONGRID_CACHE_MS) || 10000,
    isRateLimit: error => /rate ?limit|429/i.test(String(error && error.message)),
});

const headers = () => {
    const h = {};
    if (process.env.TRONGRID_API_KEY) h['TRON-PRO-API-KEY'] = process.env.TRONGRID_API_KEY;
    return h;
};

/** The address's recent confirmed USDT transfers, as this module's shape. */
const fetchTransfers = async address => {
    const { data } = await axios.get(`${TRONGRID}/v1/accounts/${address}/transactions/trc20`, {
        headers: headers(),
        params: {
            only_to: true,
            only_confirmed: true,
            limit: 100,
            contract_address: USDT_CONTRACT,
            min_timestamp: Math.max(0, Date.now() - LOOKBACK_MS),
            /* Stated rather than left to the default. The window is now the
               longest an order can live rather than one order's own, so on a
               busy address the hundred rows have to be the newest hundred —
               the oldest hundred of a seventy-minute window could miss the
               transfer that just arrived. */
            order_by: 'block_timestamp,desc',
        },
        timeout: 15000,
    });
    const rows = Array.isArray(data && data.data) ? data.data : [];
    return rows.map(t => ({
        txid: t.transaction_id,
        from: t.from,
        to: t.to,
        amount: Number(t.value) / 1e6, // USDT has 6 decimals
        timestamp: Number(t.block_timestamp) || 0,
    }));
};

/**
 * Returns confirmed incoming USDT-TRC20 transfers to `address` since `sinceMs`.
 * Each: { txid, from, to, amount (USDT), timestamp (ms) }.
 *
 * TRON's base58 addresses are case-sensitive, unlike Ethereum's hex, which is
 * why this comparison is exact and the USDC reader's is not.
 */
const getIncomingUsdt = async (address, sinceMs) => {
    if (!address) return [];

    const transfers = await gate.run(address, () => fetchTransfers(address));

    const since = Math.max(0, (sinceMs || 0) - 120000); // small back-buffer
    return transfers.filter(t => t.to && t.to === address && t.timestamp >= since);
};

module.exports = { getIncomingUsdt, USDT_CONTRACT, resetGate: gate.reset };
