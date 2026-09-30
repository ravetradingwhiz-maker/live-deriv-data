const mongoose = require('mongoose');

// One leg of a round. Rounds are a single contract, but the shape is kept from
// the retired pair round so stored history still reads back.
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
        // 'differs' = one Digit Differs contract, 'recovery' = one martingaled Even.
        // 'pair' is the retired Over 2 / Under 7 round, kept so rounds already on
        // file still load.
        mode: { type: String, enum: ['differs', 'recovery', 'pair', 'hedge'], default: 'differs' },
        /**
         * How long to wait before reading this round's profit off the balance.
         *
         * Digit rounds are one tick and settle in seconds; a hedge round is two
         * minutes. Held per round rather than as one constant, so a round that
         * was placed under one strategy still settles correctly if the session
         * is later restarted under another.
         */
        settleAfterMs: { type: Number, default: null },
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

// One row per admin running the hourly Differs printer. The Deriv PAT is stored
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
        // Market of the last round that actually filled. The next round skips it,
        // so consecutive rounds never reuse a market.
        lastSymbol: { type: String, default: '' },
        /**
         * Which opening trade the session makes.
         *
         *   differs — scan for the rarest digit and buy Differs on it
         *   even    — buy Even straight away, with no scan and nothing to wait for
         *
         * Only the opening trade differs. A loss puts either into the same
         * recovery ladder. Fixed when the session starts, and defaulted so
         * sessions written before this keep the behaviour they had.
         */
        strategy: { type: String, enum: ['differs', 'even', 'hedge'], default: 'differs' },
        /**
         * Even only: the session has been in recovery this hour and stays there.
         *
         * Differs goes back to its opening trade as soon as the deficit clears.
         * Even does not — once a loss has opened a ladder, it keeps trading
         * recovery rounds until the hourly target is met, rather than dropping
         * back to the base stake the moment it is square. Cleared when the hour
         * rolls, so each hour starts on the opening trade again.
         */
        recoveryLatched: { type: Boolean, default: false },

        /**
         * Hedge only: the profit each leg must be quoted at before a round is
         * placed, as a percentage of the stake.
         *
         * Higher is not better. Both legs are priced to their own barriers, and
         * pushing both payouts up widens the gap between those barriers — which
         * is the band where the exit spot loses BOTH legs. 150 means each leg
         * must pay at least 2.5x.
         */
        hedgeMinProfitPct: { type: Number, default: 150 },

        /**
         * Hedge only: put both legs on the SAME barriers.
         *
         * Then the two contracts are genuinely complementary — the exit spot is
         * either inside the window or outside it — so exactly one always wins
         * and the band where both lose cannot exist.
         *
         * The cost of removing that band is that it removes the upside with it.
         * Deriv prices the pair so the two implied probabilities sum to about
         * 1.024, which means the winning leg always pays back slightly less than
         * the two stakes together. This mode has one outcome, not two: a small
         * certain loss. hedgeMinProfitPct does not apply — no barrier makes both
         * legs pay 150%, so the round instead takes the window whose worst leg
         * pays the most.
         */
        hedgeSameWindow: { type: Boolean, default: false },
        // True while a freshly opened recovery ladder still owes its first rung
        // the two-consecutive-odd-digits confirmation. Cleared once that rung is
        // placed, so every retry after it goes straight in.
        recoveryWaitArmed: { type: Boolean, default: false },
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
        // Outstanding loss from the Differs round that started this ladder. Kept
        // for reporting; the recovery stake itself is a plain martingale off the
        // opening rung, not sized from this number.
        deficit: { type: Number, default: 0 },
        // Where the Even ladder opens. Its own setting rather than a multiple of
        // the base stake: Differs stakes are sized so one win banks the hour, and
        // an Even at 1.94x only has to cover the deficit, so deriving it from the
        // base stake would open several times higher than necessary.
        recoveryStartStake: { type: Number, default: 1, min: 0.35 },
        // Recovery martingale: each retry is the previous recovery stake x this.
        // Uncapped — escalates until a round wins or the session stop-loss ends it.
        recoveryMultiplier: { type: Number, default: 2 },
        lastRecoveryStake: { type: Number, default: 0 },
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
