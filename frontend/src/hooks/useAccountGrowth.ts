import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchProfitSince, type ProfitTableRow } from '@/services/trade-api';
import { useAuth } from '@/context/AuthContext';
import { usePortfolioOptional } from '@/context/PortfolioContext';
import {
    dailyBuckets,
    growthPercent,
    periodStats,
    startOfLocalDay,
    startOfLocalMonth,
    type PeriodStats,
} from '@/utils/growth';

export interface GrowthPeriod extends PeriodStats {
    percent: number | null;
}

export interface MonthGrowth extends GrowthPeriod {
    /** Per-day profit totals since the first of the month, for the sparkline. */
    buckets: number[];
}

export interface AccountGrowth {
    month: MonthGrowth;
    day: GrowthPeriod;
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

/** A settle can arrive in a burst; one request should cover the lot. */
const REFRESH_DEBOUNCE_MS = 3000;

const EMPTY_PERIOD: GrowthPeriod = { profit: 0, trades: 0, winRate: null, percent: null };

/**
 * Month-to-date and today's realised growth for the active account.
 *
 * Reads the Deriv profit table rather than `PortfolioContext.history`, which is
 * in-memory and starts empty on every reload — a dashboard that forgot the
 * month's trades whenever the tab was refreshed would be worse than none.
 */
export const useAccountGrowth = (): AccountGrowth => {
    const { isAuthenticated, activeLoginId, balance } = useAuth();
    const portfolio = usePortfolioOptional();
    const settledCount = portfolio?.history.length ?? 0;

    const [rows, setRows] = useState<ProfitTableRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Whether anything has been loaded for the account now showing, so a
    // refresh updates in place instead of blanking the cards.
    const loadedRef = useRef(false);

    const load = useCallback(() => {
        if (!isAuthenticated) {
            setRows([]);
            setLoading(false);
            return;
        }

        // The account this request belongs to. An account switch while it is in
        // flight must not drop the old account's trades onto the new one's cards.
        const requestedFor = activeLoginId;
        if (!loadedRef.current) setLoading(true);

        fetchProfitSince(startOfLocalMonth())
            .then(result => {
                if (requestedFor !== activeLoginId) return;
                setRows(result);
                setError(null);
                loadedRef.current = true;
            })
            .catch((e: unknown) => {
                if (requestedFor !== activeLoginId) return;
                setError(e instanceof Error ? e.message : 'Could not load your trade history');
            })
            .finally(() => {
                if (requestedFor !== activeLoginId) return;
                setLoading(false);
            });
    }, [isAuthenticated, activeLoginId]);

    // Reload from scratch on sign-in and on every account switch.
    useEffect(() => {
        loadedRef.current = false;
        setRows([]);
        load();
    }, [load]);

    // A trade settling changes both cards, so re-read — debounced, because a
    // bot can settle several within a second.
    useEffect(() => {
        if (!settledCount || !loadedRef.current) return;
        const t = setTimeout(load, REFRESH_DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [settledCount, load]);

    const monthStart = startOfLocalMonth();
    const dayStart = startOfLocalDay();
    const currentBalance = Number(balance) || 0;

    const monthStats = periodStats(rows, monthStart);
    const dayStats = periodStats(rows, dayStart);

    const month: MonthGrowth = loading && !loadedRef.current
        ? { ...EMPTY_PERIOD, buckets: [] }
        : {
              ...monthStats,
              percent: growthPercent(monthStats.profit, currentBalance),
              buckets: dailyBuckets(rows, monthStart),
          };

    const day: GrowthPeriod = loading && !loadedRef.current
        ? EMPTY_PERIOD
        : { ...dayStats, percent: growthPercent(dayStats.profit, currentBalance) };

    return { month, day, loading, error, refresh: load };
};

export default useAccountGrowth;
