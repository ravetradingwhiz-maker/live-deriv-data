/**
 * The maths behind the dashboard's growth cards and the growth reward.
 *
 * Pure and dependency-free on purpose: the cards and the reward must never
 * disagree about what a trade earned, so both read these functions rather than
 * each deriving profit their own way.
 */

/**
 * The only three fields any of this needs from a profit-table row.
 *
 * Declared here rather than imported from `trade-api` so this module stays
 * free of the Deriv socket (and so it can be unit-tested in node).
 * `ProfitTableRow` is structurally compatible.
 */
export interface GrowthRow {
    buy_price: number;
    sell_price: number;
    sell_time: number;
}

export interface PeriodStats {
    profit: number;
    trades: number;
    /** Share of trades that did not lose, or null when there were none. */
    winRate: number | null;
}

const SECONDS_PER_DAY = 86_400;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * What a settled contract earned.
 *
 * `profit_table` carries no `profit` field — only the two prices — so this is
 * the one place that subtraction happens.
 */
export const rowProfit = (row: Pick<GrowthRow, 'buy_price' | 'sell_price'>): number =>
    (Number(row.sell_price) || 0) - (Number(row.buy_price) || 0);

/** Local midnight today, as an epoch in seconds. */
export const startOfLocalDay = (now: Date = new Date()): number => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.floor(d.getTime() / 1000);
};

/** Local midnight on the first of this month, as an epoch in seconds. */
export const startOfLocalMonth = (now: Date = new Date()): number => {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return Math.floor(d.getTime() / 1000);
};

/**
 * Profit, trade count and win rate over the rows settled at or after `since`.
 *
 * A break-even trade counts as a win, matching the bot engine and
 * `PortfolioContext.sessionStats` — the app must not call the same trade a win
 * on one screen and a loss on another.
 */
export const periodStats = (rows: GrowthRow[], since: number): PeriodStats => {
    let profit = 0;
    let trades = 0;
    let won = 0;

    for (const row of rows) {
        if ((Number(row.sell_time) || 0) < since) continue;
        const p = rowProfit(row);
        profit += p;
        trades += 1;
        if (p >= 0) won += 1;
    }

    return {
        profit: round2(profit),
        trades,
        winRate: trades === 0 ? null : won / trades,
    };
};

/**
 * Growth over the equity the period opened with, as a fraction.
 *
 * Null whenever the opening equity is zero or negative: dividing by it yields
 * Infinity or a sign-flipped percentage, and a card showing either is worse
 * than one showing nothing.
 */
export const growthPercent = (profit: number, currentBalance: number): number | null => {
    const opening = currentBalance - profit;
    if (!Number.isFinite(opening) || opening <= 0) return null;
    return profit / opening;
};

/**
 * One profit total per local day from `since` through `now`, zero-filled, for
 * the sparkline. Always at least one bucket, so a day with no trades still
 * draws a flat line rather than nothing.
 */
export const dailyBuckets = (rows: GrowthRow[], since: number, now: Date = new Date()): number[] => {
    const today = startOfLocalDay(now);
    const days = Math.max(0, Math.round((today - since) / SECONDS_PER_DAY)) + 1;
    const buckets = new Array<number>(days).fill(0);

    for (const row of rows) {
        const settled = Number(row.sell_time) || 0;
        if (settled < since) continue;
        // Bucket by local day, so a trade at 01:00 for a user east of UTC lands
        // on their today rather than on yesterday.
        const day = startOfLocalDay(new Date(settled * 1000));
        const index = Math.round((day - since) / SECONDS_PER_DAY);
        if (index >= 0 && index < days) buckets[index] += rowProfit(row);
    }

    return buckets.map(round2);
};
