const mongoose = require('mongoose');

// One leg of an O5U4 round (Over 5 / Under 4 are bought as a pair).
const LegSchema = new mongoose.Schema(
    {
        contract_type: { type: String, required: true },
        barrier: { type: String, required: true },
        contract_id: { type: String, default: '' },
        buy_price: { type: Number, default: 0 },
        transaction_id: { type: String, default: '' },
        error: { type: String, default: '' },
    },
    { _id: false }
);

// One hourly round. `balanceBefore` is captured immediately before the buys so
// profit can be derived from the balance delta once the 1-tick legs settle.
const TradeSchema = new mongoose.Schema(
    {
        hourKey: { type: String, required: true },
        symbol: { type: String, required: true },
        stake: { type: Number, required: true },
        legs: { type: [LegSchema], default: [] },
        balanceBefore: { type: Number, default: 0 },
        profit: { type: Number, default: null },
        status: { type: String, enum: ['open', 'settled', 'failed'], default: 'open' },
        reason: { type: String, default: '' },
        placedAt: { type: Date, default: Date.now },
        settledAt: { type: Date, default: null },
    },
    { _id: false }
);

// One row per admin running the hourly O5U4 printer. The Deriv PAT is stored
// encrypted (Services/printerCrypto) and is never returned by any endpoint.
const PrinterSessionSchema = new mongoose.Schema(
    {
        loginid: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
        account_id: { type: String, required: true },
        // Demo and real buy through different Deriv endpoints, so the type is
        // pinned at start time rather than re-derived when a round is placed.
        account_type: { type: String, enum: ['real', 'demo'], default: 'real' },
        currency: { type: String, default: 'USD' },
        tokenEnc: { type: String, required: true },
        // Deriv-App-ID used for the purchase calls, captured at start so the
        // hourly job never has to reach for request-time configuration.
        appId: { type: String, required: true },
        stake: { type: Number, required: true, min: 0.35 },
        active: { type: Boolean, default: false, index: true },
        // Guards one-trade-per-hour. Claimed atomically before a round is placed.
        lastHourKey: { type: String, default: '' },
        stopLoss: { type: Number, default: 0 }, // 0 = disabled
        takeProfit: { type: Number, default: 0 }, // 0 = disabled
        stoppedReason: { type: String, default: '' },
        stats: {
            trades: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            profit: { type: Number, default: 0 },
        },
        // Capped to the most recent rounds by the engine to bound document size.
        trades: { type: [TradeSchema], default: [] },
        startedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model('PrinterSession', PrinterSessionSchema);
