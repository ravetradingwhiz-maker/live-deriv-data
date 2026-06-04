const axios = require('axios');

const TRONGRID = 'https://api.trongrid.io';
// Official Tether USDT TRC-20 contract on TRON mainnet.
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

const headers = () => {
    const h = {};
    if (process.env.TRONGRID_API_KEY) h['TRON-PRO-API-KEY'] = process.env.TRONGRID_API_KEY;
    return h;
};

/**
 * Returns confirmed incoming USDT-TRC20 transfers to `address` since `sinceMs`.
 * Each: { txid, from, to, amount (USDT), timestamp (ms) }.
 */
const getIncomingUsdt = async (address, sinceMs) => {
    const { data } = await axios.get(`${TRONGRID}/v1/accounts/${address}/transactions/trc20`, {
        headers: headers(),
        params: {
            only_to: true,
            only_confirmed: true,
            limit: 100,
            contract_address: USDT_CONTRACT,
            min_timestamp: Math.max(0, (sinceMs || 0) - 120000), // small back-buffer
        },
    });
    const rows = Array.isArray(data?.data) ? data.data : [];
    return rows
        .map(t => ({
            txid: t.transaction_id,
            from: t.from,
            to: t.to,
            amount: Number(t.value) / 1e6, // USDT has 6 decimals
            timestamp: Number(t.block_timestamp) || 0,
        }))
        .filter(t => t.to && t.to === address);
};

module.exports = { getIncomingUsdt, USDT_CONTRACT };
