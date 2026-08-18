const mongoose = require('mongoose');

// One leg of an O5U4 round (Over 5 / Under 4 are bought as a pair).
const LegSchema = new mongoose.Schema(
    {
        contract_type: { type: String, required: true },
        // Not required: Even has no barrier, and Mongoose counts '' as missing.
        barrier: { type: String, default: '' },
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
        // 'pair' = Over 2 + Under 7, 'recovery' = a single Even sized to the deficit
        mode: { type: String, enum: ['pair', 'recovery'], default: 'pair' },
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
        // The hour currently being worked, plus its running tally. The session
        // trades within an hour until it banks `hourlyTarget`, then idles until
        // the next one.
        lastHourKey: { type: String, default: '' },
        hourlyTarget: { type: Number, default: 2 },
        hourlyProfit: { type: Number, default: 0 },
        hourRounds: { type: Number, default: 0 },
        // Set when the hour is finished — target reached, or a brake tripped.
        hourDone: { type: Boolean, default: false },
        hourEndedReason: { type: String, default: '' },
        // Kept for reporting only — the hour is not capped by round count.
        // The session stop-loss is the brake.
        maxHourlyLossMultiple: { type: Number, default: 0 }, // x base stake, 0 = off
        // Claimed atomically so two workers can never place at the same time.
        roundInFlight: { type: Boolean, default: false },
        stopLoss: { type: Number, default: 0 }, // 0 = disabled
        takeProfit: { type: Number, default: 0 }, // 0 = disabled
        // Outstanding loss the next round tries to win back with an Even contract.
        // Above zero means the session is in recovery.
        deficit: { type: Number, default: 0 },
        // Martingale on the recovery ladder. The stake is the larger of what
        // clears the deficit and the previous recovery stake times this, so a
        // multiplier above ~2 escalates faster than the deficit alone would.
        recoveryMultiplier: { type: Number, default: 2 },
        lastRecoveryStake: { type: Number, default: 0 },
        maxRecoveryMultiple: { type: Number, default: 10 }, // x base stake
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
