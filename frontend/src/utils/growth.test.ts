import { describe, expect, it } from 'vitest';
import {
    dailyBuckets,
    growthPercent,
    periodStats,
    rowProfit,
    startOfLocalDay,
    startOfLocalMonth,
    type GrowthRow,
} from '@/utils/growth';

const row = (over: Partial<GrowthRow>): GrowthRow => ({
    buy_price: 10,
    sell_price: 20,
    sell_time: 0,
    ...over,
});

describe('rowProfit', () => {
    it('is sell minus buy', () => {
        expect(rowProfit({ buy_price: 10, sell_price: 19.5 })).toBe(9.5);
    });

    it('is negative for a loss', () => {
        expect(rowProfit({ buy_price: 10, sell_price: 0 })).toBe(-10);
    });
});

describe('periodStats', () => {
    it('returns zeroes and a null win rate for no rows', () => {
        expect(periodStats([], 0)).toEqual({ profit: 0, trades: 0, winRate: null });
    });

    it('counts a break-even trade as a win', () => {
        const rows = [row({ sell_time: 100, buy_price: 10, sell_price: 10 })];
        expect(periodStats(rows, 0).winRate).toBe(1);
    });

    it('excludes rows settled before the cutoff', () => {
        const rows = [
            row({ sell_time: 50, buy_price: 10, sell_price: 30 }),
            row({ sell_time: 150, buy_price: 10, sell_price: 20 }),
        ];
        expect(periodStats(rows, 100)).toEqual({ profit: 10, trades: 1, winRate: 1 });
    });

    it('reports a half win rate over one win and one loss', () => {
        const rows = [
            row({ sell_time: 150, buy_price: 10, sell_price: 20 }),
            row({ sell_time: 160, buy_price: 10, sell_price: 0 }),
        ];
        expect(periodStats(rows, 100)).toEqual({ profit: 0, trades: 2, winRate: 0.5 });
    });
});

describe('growthPercent', () => {
    it('measures profit against opening equity', () => {
        expect(growthPercent(50, 150)).toBeCloseTo(0.5);
    });

    it('is null when opening equity is zero', () => {
        expect(growthPercent(100, 100)).toBeNull();
    });

    it('is null when opening equity is negative', () => {
        expect(growthPercent(100, 50)).toBeNull();
    });

    it('is null when there is no profit and no balance', () => {
        expect(growthPercent(0, 0)).toBeNull();
    });

    it('is negative for a losing period', () => {
        expect(growthPercent(-25, 75)).toBeCloseTo(-0.25);
    });
});

describe('startOfLocalDay', () => {
    it('is local midnight, not UTC midnight', () => {
        const d = new Date(2026, 10, 3, 1, 30);
        const start = new Date(startOfLocalDay(d) * 1000);
        expect(start.getHours()).toBe(0);
        expect(start.getMinutes()).toBe(0);
        expect(start.getDate()).toBe(3);
    });
});

describe('startOfLocalMonth', () => {
    it('is the first of the local month at midnight', () => {
        const d = new Date(2026, 10, 17, 9, 5);
        const start = new Date(startOfLocalMonth(d) * 1000);
        expect(start.getDate()).toBe(1);
        expect(start.getMonth()).toBe(10);
        expect(start.getHours()).toBe(0);
    });
});

describe('dailyBuckets', () => {
    it('returns one zero-filled entry per local day since the cutoff', () => {
        const day0 = new Date(2026, 10, 1, 0, 0);
        const cutoff = Math.floor(day0.getTime() / 1000);
        const atDay = (n: number, hour: number) =>
            Math.floor(new Date(2026, 10, 1 + n, hour).getTime() / 1000);

        const rows = [
            row({ sell_time: atDay(0, 10), buy_price: 10, sell_price: 25 }),
            row({ sell_time: atDay(2, 14), buy_price: 10, sell_price: 0 }),
        ];

        expect(dailyBuckets(rows, cutoff, new Date(2026, 10, 3, 23, 0))).toEqual([15, 0, -10]);
    });

    it('is empty when there are no rows and the cutoff is now', () => {
        const now = new Date(2026, 10, 3, 12, 0);
        expect(dailyBuckets([], Math.floor(now.getTime() / 1000), now)).toEqual([0]);
    });
});
