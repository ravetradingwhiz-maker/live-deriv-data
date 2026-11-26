import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { subscribePortfolio } from '@/services/trade-api';
import type { Subscription } from '@/services/trade-ws';
import { useAuth } from '@/context/AuthContext';

import { FALLBACK_SYMBOLS } from '@/constants/symbols';

/**
 * The market a contract names, however the payload spells it.
 *
 * `proposal_open_contract` carries `underlying_symbol` — not `underlying`, and
 * not `display_name`, which it has never sent. Reading only the two old names
 * meant every real position fell through to a dash, while admin-simulated ones
 * read correctly because the app fills those fields in itself.
 *
 * The symbol is resolved to its name through the same catalogue the market
 * picker uses, and failing that shows the code: "R_50" says more than "—".
 */
export const marketNameOf = (c: {
    display_name?: string;
    underlying?: string;
    underlying_symbol?: string;
}): string => {
    if (c.display_name) return c.display_name;
    const symbol = c.underlying_symbol || c.underlying || '';
    if (!symbol) return '—';
    return FALLBACK_SYMBOLS.find(s => s.symbol === symbol)?.display_name ?? symbol;
};

/**
 * What `proposal_open_contract` carries beyond the few figures a summary row
 * needs — the spots, times and barriers the transactions panel shows when a
 * row is expanded.
 *
 * Both an open and a settled contract carry them, so a row keeps its details
 * after it settles rather than losing them the moment it leaves the stream.
 *
 * Spots are read from the `*_display_value` strings and not the numbers beside
 * them: Deriv quotes each symbol to its own number of decimals, and the number
 * has already dropped the trailing zeros a digit contract turns on.
 */
export interface ContractDetails {
    entry_spot_display_value?: string;
    entry_spot?: number | string;
    entry_tick_display_value?: string;
    entry_tick?: number | string;
    entry_tick_time?: number;
    exit_spot_display_value?: string;
    exit_spot?: number | string;
    exit_spot_time?: number;
    sell_spot_display_value?: string;
    sell_spot?: number | string;
    sell_spot_time?: number;
    exit_tick_display_value?: string;
    exit_tick?: number | string;
    exit_tick_time?: number;
    sell_time?: number;
    date_start?: number;
    tick_count?: number;
    barrier?: string;
    high_barrier?: string;
    low_barrier?: string;
    transaction_ids?: { buy?: number; sell?: number };
    /** The contract's own ticks. On the live payload only — not kept. */
    tick_stream?: { epoch?: number; tick?: number; tick_display_value?: string }[];
    /** The two spots, resolved once at settlement and kept. */
    entrySpot?: string;
    exitSpot?: string;
}

/**
 * The entry and exit spots, whichever of their names the payload used.
 *
 * The stream spells each of them several ways and fills in different ones for
 * different contract types, so reading a single name shows a dash on contracts
 * that do carry the price. This is the chain the bots' run panel reads, plus
 * the contract's own ticks as a last resort.
 *
 * The last tick only counts once the contract is settled: on a running one it
 * is the current price, which is not an exit spot and must not be shown as one.
 */
export const spotsOf = (c: ContractDetails, settled: boolean): { entry?: string; exit?: string } => {
    const show = (v?: number | string) => (v == null || v === '' ? undefined : String(v));
    const ticks = Array.isArray(c.tick_stream) ? c.tick_stream : [];
    const first = ticks[0];
    const last = settled && ticks.length > 1 ? ticks[ticks.length - 1] : undefined;

    return {
        entry:
            c.entrySpot ??
            show(c.entry_spot_display_value) ??
            show(c.entry_spot) ??
            show(c.entry_tick_display_value) ??
            show(c.entry_tick) ??
            show(first?.tick_display_value) ??
            show(first?.tick),
        exit:
            c.exitSpot ??
            show(c.exit_spot_display_value) ??
            show(c.exit_spot) ??
            show(c.sell_spot_display_value) ??
            show(c.sell_spot) ??
            show(c.exit_tick_display_value) ??
            show(c.exit_tick) ??
            show(last?.tick_display_value) ??
            show(last?.tick),
    };
};

/** When the contract ended, under whichever name carried it. */
export const exitTimeOf = (c: ContractDetails): number | undefined =>
    c.exit_tick_time ?? c.exit_spot_time ?? c.sell_spot_time ?? c.sell_time;

export interface OpenPosition extends ContractDetails {
    contract_id: number;
    contract_type?: string;
    display_name?: string;
    underlying?: string;
    /** What the API actually sends. `underlying` and `display_name` are the old
     *  spellings, kept because the admin-simulated path fills those in. */
    underlying_symbol?: string;
    longcode?: string;
    buy_price?: number;
    bid_price?: number;
    profit?: number;
    currency?: string;
    purchase_time?: number;
    is_sold?: number;
}

export interface ClosedTrade extends ContractDetails {
    contract_id: number;
    contract_type?: string;
    market: string;
    /** The symbol itself, which the market mark beside the row is drawn from —
     *  `market` is its display name and cannot be mapped back to a symbol. */
    symbol?: string;
    longcode?: string;
    buy_price: number;
    profit: number;
    time: number;
}

/**
 * The detail fields, picked one by one rather than spread.
 *
 * A `proposal_open_contract` payload also carries the contract's whole tick
 * stream and audit trail, and a hundred of those kept in session history is a
 * lot of memory for figures nothing reads.
 */
const detailsOf = (c: ContractDetails): ContractDetails => ({
    entry_spot_display_value: c.entry_spot_display_value,
    entry_spot: c.entry_spot,
    entry_tick_display_value: c.entry_tick_display_value,
    entry_tick: c.entry_tick,
    entry_tick_time: c.entry_tick_time,
    exit_spot_display_value: c.exit_spot_display_value,
    exit_spot: c.exit_spot,
    exit_spot_time: c.exit_spot_time,
    sell_spot_display_value: c.sell_spot_display_value,
    sell_spot: c.sell_spot,
    sell_spot_time: c.sell_spot_time,
    exit_tick_display_value: c.exit_tick_display_value,
    exit_tick: c.exit_tick,
    exit_tick_time: c.exit_tick_time,
    sell_time: c.sell_time,
    date_start: c.date_start,
    tick_count: c.tick_count,
    barrier: c.barrier,
    high_barrier: c.high_barrier,
    low_barrier: c.low_barrier,
    transaction_ids: c.transaction_ids,
    // Resolved here, while the tick stream is still in hand to resolve it from.
    entrySpot: spotsOf(c, true).entry,
    exitSpot: spotsOf(c, true).exit,
});

/**
 * The run panel's six figures, over the trades that have closed this session.
 *
 * Derived from `history` rather than counted as trades settle, so it can never
 * drift from the list it describes — and Reset, which just empties `history`,
 * zeroes the statistics for free.
 */
export interface SessionStats {
    /** Closed contracts — what the run panel calls "No. of runs". */
    runs: number;
    won: number;
    lost: number;
    totalStake: number;
    totalPayout: number;
    totalProfit: number;
}

interface PortfolioContextValue {
    /** Live open contracts for the active account (any source: manual or bot). */
    openPositions: OpenPosition[];
    /** Trades that have closed this session (in-memory; cleared on reload). */
    history: ClosedTrade[];
    /**
     * The admin-simulated ones, kept apart from `history`.
     *
     * These never reach Deriv, so nothing that reads the profit table can see
     * them and the dashboard has to be handed them directly. They live in
     * their own list because Reset empties `history` — that is its job, it
     * clears the run panel's statistics — and resetting a bot run should not
     * also wipe the month's figures off the dashboard.
     */
    simulatedHistory: ClosedTrade[];
    /** Session totals over `history`, for the positions panel. */
    sessionStats: SessionStats;
    clearHistory: () => void;
    /**
     * Bumped every time the history is cleared.
     *
     * A bot keeps its own running total — the figure on its card is the bot's,
     * not a sum over this history — so Reset has to reach it somehow. This is
     * the signal it watches; a counter rather than a boolean, so two resets in
     * a row are two distinct events.
     */
    clearedAt: number;
    /** Admin (fake-trade) mode: inject a simulated open position so it shows live. */
    addAdminPosition: (pos: OpenPosition) => void;
    /** Admin (fake-trade) mode: settle a simulated position and record it to history. */
    settleAdminPosition: (contractId: number, profit: number, exit?: ContractDetails) => void;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

/**
 * Lives above the app tabs so the portfolio subscription stays alive across
 * navigation. Streams account-wide open contracts and records each one to a
 * session history as it settles. Session history is in-memory only, so a page
 * reload starts fresh.
 */
export const PortfolioProvider = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated, activeLoginId } = useAuth();
    const [positions, setPositions] = useState<Record<number, OpenPosition>>({});
    const [history, setHistory] = useState<ClosedTrade[]>([]);
    const [simulatedHistory, setSimulatedHistory] = useState<ClosedTrade[]>([]);
    const recordedRef = useRef<Set<number>>(new Set());
    const positionsRef = useRef(positions);
    positionsRef.current = positions;
    const subRef = useRef<Subscription | null>(null);

    const [clearedAt, setClearedAt] = useState(0);

    /* Deliberately leaves `simulatedHistory` alone: Reset is the run panel's
       control over its own statistics, not a way to erase the account's
       month. */
    const clearHistory = useCallback(() => {
        setHistory([]);
        recordedRef.current = new Set();
        setClearedAt(n => n + 1);
    }, []);

    // ── Admin (fake-trade) mode ──────────────────────────────────────────────
    // Simulated bot trades never hit the real portfolio stream, so feed them in
    // here too — that way the Positions drawer / Open Positions page show them
    // live, then move them to session history when they settle.
    const addAdminPosition = useCallback((pos: OpenPosition) => {
        setPositions(prev => ({ ...prev, [pos.contract_id]: pos }));
    }, []);

    const settleAdminPosition = useCallback((contractId: number, profit: number, exit?: ContractDetails) => {
        const existing = positionsRef.current[contractId];
        setPositions(prev => {
            const next = { ...prev };
            delete next[contractId];
            return next;
        });
        if (existing && !recordedRef.current.has(contractId)) {
            recordedRef.current.add(contractId);
            const settled: ClosedTrade = {
                contract_id: contractId,
                contract_type: existing.contract_type,
                market: marketNameOf(existing),
                symbol: existing.underlying_symbol || existing.underlying,
                longcode: existing.longcode,
                buy_price: Number(existing.buy_price) || 0,
                profit,
                time: Math.floor(Date.now() / 1000),
                // The exit spot exists only at settlement, so it arrives with
                // the call rather than from the position being settled.
                ...detailsOf({ ...existing, ...exit }),
            };
            // Recorded twice on purpose: the run panel's history, which Reset
            // may empty, and the dashboard's, which it may not.
            setHistory(prev => [settled, ...prev].slice(0, 100));
            setSimulatedHistory(prev => [settled, ...prev].slice(0, 500));
        }
    }, []);

    useEffect(() => {
        // Reset on (re)subscribe — including account switches. Unlike Reset,
        // this does clear the simulated run too: it belonged to the account
        // being switched away from.
        setPositions({});
        setHistory([]);
        setSimulatedHistory([]);
        recordedRef.current = new Set();

        if (!isAuthenticated) return;

        let active = true;
        (async () => {
            try {
                subRef.current = await subscribePortfolio((poc: OpenPosition & { sell_price?: number; sell_time?: number }) => {
                    if (!active) return;
                    const id = poc?.contract_id;
                    // No open contracts → Deriv sends an empty object. Ignore it
                    // so it doesn't render as a blank "—" position.
                    if (!id) return;

                    /* The last payload, parked where it can be read from the
                       console as `__poc`. The endpoint renames fields between
                       versions — `underlying_symbol` for `underlying` was one —
                       and when a figure goes missing from a row, the payload it
                       came in is the only thing that settles which name it has
                       now. It logs nothing and holds one object. */
                    (window as unknown as Record<string, unknown>).__poc = poc;

                    if (poc.is_sold) {
                        setPositions(prev => {
                            const next = { ...prev };
                            delete next[id];
                            return next;
                        });
                        if (!recordedRef.current.has(id)) {
                            recordedRef.current.add(id);
                            const buy = Number(poc.buy_price) || 0;
                            const profit = poc.profit != null ? Number(poc.profit) : (Number(poc.sell_price) || 0) - buy;
                            setHistory(prev =>
                                [
                                    {
                                        contract_id: id,
                                        contract_type: poc.contract_type,
                                        market: marketNameOf(poc),
                                        symbol: poc.underlying_symbol || poc.underlying,
                                        longcode: poc.longcode,
                                        buy_price: buy,
                                        profit,
                                        time: poc.sell_time || poc.purchase_time || Math.floor(Date.now() / 1000),
                                        ...detailsOf(poc),
                                    },
                                    ...prev,
                                ].slice(0, 100)
                            );
                        }
                    } else {
                        setPositions(prev => ({ ...prev, [id]: poc }));
                    }
                });
            } catch {
                /* portfolio stream unavailable — pages just show empty */
            }
        })();

        return () => {
            active = false;
            subRef.current?.forget();
            subRef.current = null;
        };
    }, [isAuthenticated, activeLoginId]);

    const openPositions = Object.values(positions).sort((a, b) => (b.purchase_time ?? 0) - (a.purchase_time ?? 0));

    const sessionStats = useMemo<SessionStats>(() => {
        let won = 0;
        let lost = 0;
        let totalStake = 0;
        let totalPayout = 0;
        let totalProfit = 0;

        for (const trade of history) {
            const profit = Number(trade.profit) || 0;
            const stake = Number(trade.buy_price) || 0;
            totalStake += stake;
            totalProfit += profit;
            // `>= 0` counts as a win, matching the bot engine and the trade rows.
            // A loser pays nothing, so only a winner adds to the payout.
            if (profit >= 0) {
                won += 1;
                totalPayout += stake + profit;
            } else {
                lost += 1;
            }
        }

        const round2 = (n: number) => Math.round(n * 100) / 100;
        return {
            runs: history.length,
            won,
            lost,
            totalStake: round2(totalStake),
            totalPayout: round2(totalPayout),
            totalProfit: round2(totalProfit),
        };
    }, [history]);

    return (
        <PortfolioContext.Provider
            value={{
                openPositions,
                history,
                simulatedHistory,
                sessionStats,
                clearHistory,
                clearedAt,
                addAdminPosition,
                settleAdminPosition,
            }}
        >
            {children}
        </PortfolioContext.Provider>
    );
};

export const usePortfolio = (): PortfolioContextValue => {
    const ctx = useContext(PortfolioContext);
    if (!ctx) throw new Error('usePortfolio must be used within a PortfolioProvider');
    return ctx;
};

export const usePortfolioOptional = (): PortfolioContextValue | null => useContext(PortfolioContext);
