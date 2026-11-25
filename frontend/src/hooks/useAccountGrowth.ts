import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchProfitSince, type ProfitTableRow } from '@/services/trade-api';
import { useAuth } from '@/context/AuthContext';
import { usePortfolioOptional, type ClosedTrade } from '@/context/PortfolioContext';
import { useAdminOptional } from '@/context/AdminContext';
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
    /**
     * The month's settled trades, newest first, for the activity list.
     *
     * Taken from the rows already fetched for the figures above rather than a
     * request of its own — and from the profit table rather than the in-memory
     * session history, which empties on every reload.
     */
    recent: ProfitTableRow[];
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

/** A settle can arrive in a burst; one request should cover the lot. */
const REFRESH_DEBOUNCE_MS = 3000;

const EMPTY_PERIOD: GrowthPeriod = { profit: 0, trades: 0, winRate: null, percent: null };

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Month-to-date and today's realised growth for the active account.
 *
 * Reads the Deriv profit table rather than `PortfolioContext.history`, which is
 * in-memory and starts empty on every reload — a dashboard that forgot the
 * month's trades whenever the tab was refreshed would be worse than none.
 *
 * Admin (fake-trade) mode is the exception. Those trades are never sent to
 * Deriv, so the profit table cannot see them and the cards sat at zero while
 * the simulated balance moved. While admin mode is active they are folded in
 * from the session history, which is the only place they exist — so they reset
 * on reload, unlike the real ones.
 */
export const useAccountGrowth = (): AccountGrowth => {
    const { isAuthenticated, activeLoginId, balance } = useAuth();
    const portfolio = usePortfolioOptional();
    const admin = useAdminOptional();
    const settledCount = portfolio?.history.length ?? 0;
    const adminActive = !!admin?.active;

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

    /* A simulated trade seen as the profit table would have reported it, had it
       ever been sent. Only the four fields the cards and the activity list read
       are real; the rest exist to satisfy the shape. */
    const asProfitRow = (t: ClosedTrade): ProfitTableRow => ({
        contract_id: t.contract_id,
        longcode: t.longcode ?? `${t.contract_type ?? 'Trade'} · ${t.market}`,
        buy_price: t.buy_price,
        sell_price: round2(t.buy_price + t.profit),
        payout: round2(Math.max(0, t.buy_price + t.profit)),
        purchase_time: t.time,
        sell_time: t.time,
        transaction_id: t.contract_id,
    });

    /* Gated on admin mode being active, not merely on the rows existing: on
       leaving it the balance goes back to the real one, and simulated profit
       sitting beside it would be a figure of nothing. */
    const historyKey = portfolio?.history.length ?? 0;
    const allRows = useMemo(() => {
        if (!adminActive) return rows;
        const simulated = (portfolio?.history ?? []).filter(t => t.simulated).map(asProfitRow);
        return simulated.length ? [...rows, ...simulated] : rows;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, adminActive, historyKey]);

    const monthStats = periodStats(allRows, monthStart);
    const dayStats = periodStats(allRows, dayStart);

    const month: MonthGrowth = loading && !loadedRef.current
        ? { ...EMPTY_PERIOD, buckets: [] }
        : {
              ...monthStats,
              percent: growthPercent(monthStats.profit, currentBalance),
              buckets: dailyBuckets(allRows, monthStart),
          };

    const day: GrowthPeriod = loading && !loadedRef.current
        ? EMPTY_PERIOD
        : { ...dayStats, percent: growthPercent(dayStats.profit, currentBalance) };

    const recent = [...allRows].sort((a, b) => (Number(b.sell_time) || 0) - (Number(a.sell_time) || 0));

    return { month, day, recent, loading, error, refresh: load };
};

export default useAccountGrowth;
