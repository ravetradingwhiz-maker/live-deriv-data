const axios = require('axios');
const { createGate } = require('./explorerGate');

/**
 * Incoming USDC-ERC20 transfers, read from Etherscan.
 *
 * The Tron side of this (tronChainService, which watches USDT) and this one
 * return the same shape on purpose, so the order checker can treat a TRON
 * payment and an Ethereum one alike and only the lookup differs.
 */

/* Etherscan's multichain endpoint. Held in env as well so the base can be
   repointed — to a testnet, or to a compatible mirror — without a deploy. */
const ETHERSCAN = process.env.ETHERSCAN_API_URL || 'https://api.etherscan.io/v2/api';
const CHAIN_ID = process.env.ETH_CHAIN_ID || '1';

/** Circle's USDC contract on Ethereum mainnet. */
const USDC_CONTRACT = process.env.USDC_CONTRACT || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

/** USDC is 6 decimals, not ERC-20's usual 18. */
const USDC_DECIMALS = 6;

/**
 * Etherscan's free tier allows a few calls a second across the whole key, and
 * the order sweep asks about every pending order in a row — all of them about
 * the same deposit address. The gate turns that back into one question.
 */
const gate = createGate({
    minGapMs: Number(process.env.ETHERSCAN_MIN_GAP_MS) || 400,
    cacheMs: Number(process.env.ETHERSCAN_CACHE_MS) || 10000,
    isRateLimit: error => /rate limit/i.test(String(error && error.message)),
});

/**
 * The address's last hundred USDC transfers, as this module's shape.
 *
 * Unbounded in time on purpose: the window each caller wants differs per order,
 * and a request that asked for one of them could not be shared with the rest.
 * The time filter belongs to the caller, the request does not.
 */
const fetchTransfers = async address => {
    const { data } = await axios.get(ETHERSCAN, {
        params: {
            chainid: CHAIN_ID,
            module: 'account',
            action: 'tokentx',
            contractaddress: USDC_CONTRACT,
            address,
            page: 1,
            offset: 100,
            sort: 'desc',
            apikey: process.env.ETHERSCAN_API_KEY || '',
        },
        timeout: 15000,
    });

    /* Etherscan answers 200 with status "0" for both "no transactions" and a
       rate-limit or bad key. An empty result is normal; anything else said in
       the message is worth seeing, because a silent miss here means a paid
       order never settles. */
    if (data && data.status !== '1') {
        const msg = String(data.message || '');
        if (!/no transactions found/i.test(msg)) {
            throw new Error(`Etherscan: ${msg || 'unexpected response'}${data.result ? ` — ${data.result}` : ''}`);
        }
        return [];
    }

    const rows = Array.isArray(data && data.result) ? data.result : [];
    return rows.map(t => ({
        txid: t.hash,
        from: String(t.from || '').toLowerCase(),
        to: String(t.to || '').toLowerCase(),
        // tokenDecimal is read from the row rather than assumed: the
        // contract can be repointed in env, and 18 decimals read as 6
        // would misread an amount by a factor of a trillion.
        amount: Number(t.value) / Math.pow(10, Number(t.tokenDecimal) || USDC_DECIMALS),
        timestamp: Number(t.timeStamp) * 1000 || 0,
    }));
};

/**
 * Confirmed incoming USDC transfers to `address` since `sinceMs`.
 * Each: { txid, from, to, amount (USDC), timestamp (ms) }.
 *
 * Ethereum addresses are hex and case-insensitive — the same address is
 * written a dozen ways depending on checksum casing — so every comparison
 * here is lowercased. Tron's base58 addresses are not, which is why the two
 * services cannot share this code.
 */
const getIncomingUsdc = async (address, sinceMs) => {
    if (!address) return [];
    const wanted = String(address).toLowerCase();

    // Keyed by the address, which is what the request is about — every pending
    // order on this chain is asking about the same one.
    const transfers = await gate.run(wanted, () => fetchTransfers(address));

    const since = Math.max(0, (sinceMs || 0) - 120000); // small back-buffer
    return transfers.filter(t => t.to === wanted && t.timestamp >= since);
};

module.exports = { getIncomingUsdc, USDC_CONTRACT, USDC_DECIMALS, resetGate: gate.reset };
