import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ListChecks, Loader2, RotateCcw, Square, X } from 'lucide-react';
import { LabelPairedChevronsRightCaptionRegularIcon } from '@deriv/quill-icons/LabelPaired';
import { LegacyHandleLessIcon, LegacyRadioOffIcon, LegacyRadioOnIcon } from '@deriv/quill-icons/Legacy';
import { useAuth } from '@/context/AuthContext';
import {
    exitTimeOf,
    marketNameOf,
    spotsOf,
    usePortfolio,
    type ClosedTrade,
    type ContractDetails,
    type OpenPosition,
} from '@/context/PortfolioContext';
import { useBotRun } from '@/context/BotRunContext';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { getActiveCurrency, sellContract } from '@/services/trade-api';
import { contractTypeLabel, fmtDateTime, fmtSigned } from '@/utils/contract-format';
import MarketIcon from '@/components/market/MarketIcon';
import TradeTypeIcon from '@/components/TradeTypeIcon';

/**
 * Global positions panel — the run panel the bots have, in this app's clothes.
 *
 * Opens and closes from a tab on its own edge, never a floating button: a strip
 * down the left edge on desktop, a bar across the top on mobile. The strip is
 * always there, so the panel is always one tap away and nothing has to decide
 * whether a button should exist. It carries the panel's own mark and the number
 * of trades behind it, because a bare chevron reads as a border and people were
 * not finding what it opened.
 *
 * One list, newest first. A contract joins it live the moment it is bought and
 * settles in place, the way a row in the bots' Transactions tab does — so the
 * list is the session, not two lists that have to be reconciled.
 *
 * It reports rather than drives: the only control over a run is a Stop, and only
 * while one is going. Starting stays on the bot's own page, where the settings
 * that a run needs actually live. It sits above the tab outlet, so a session
 * survives navigation.
 */

/** Height of the collapsed handle on mobile. */
const HANDLE = 40;
/**
 * Width of the collapsed toggle strip on desktop.
 *
 * Wider than the 16px the bots use so the strip can hold a mark and a count
 * rather than a lone chevron: a bare sliver reads as a border, and people were
 * not finding the panel behind it.
 */
const TOGGLE = 36;
const PANEL = 366;
/** The app header is 4rem tall and sticky; the panel starts below it. */
const HEADER = 64;

/**
 * The transactions grid — type, entry/exit spot, buy price and P/L, and the
 * disclosure chevron. The header and every row are laid out on it, which is
 * what keeps a column under its own label.
 *
 * Each row fills two lines of it: the type spans both, the entry spot sits above
 * the exit spot, and the buy price above the P/L it produced. That pairing is
 * the point of the layout — a contract's two ends read down a column rather
 * than across a line.
 */
const GRID = 'grid grid-cols-[0.9fr_1fr_1.1fr_1rem] items-center gap-x-2';

/** Rows come from two stores; this is the shape the list actually renders. */
interface Row {
    contract_id: number;
    contract_type?: string;
    /** The symbol, for the market mark. `market` is its display name. */
    symbol?: string;
    market: string;
    stake: number;
    profit: number;
    /** Live contracts show a Sell button and a moving P&L. */
    isOpen: boolean;
    /** Closed rows carry the time they settled; open ones their current value. */
    time?: number;
    value?: number;
    /** Spots, times and barriers — what the row shows once it is expanded. */
    details: ContractDetails;
}

const openRow = (p: OpenPosition): Row => ({
    contract_id: p.contract_id,
    contract_type: p.contract_type,
    symbol: p.underlying_symbol || p.underlying,
    market: marketNameOf(p),
    stake: Number(p.buy_price) || 0,
    profit: Number(p.profit) || 0,
    value: Number(p.bid_price) || 0,
    isOpen: true,
    details: p,
});

const closedRow = (t: ClosedTrade): Row => ({
    contract_id: t.contract_id,
    contract_type: t.contract_type,
    symbol: t.symbol,
    market: t.market,
    stake: Number(t.buy_price) || 0,
    profit: Number(t.profit) || 0,
    time: t.time,
    isOpen: false,
    details: t,
});

/**
 * The contract in words — "Over 2" rather than "DIGITOVER", with the barrier
 * the type means nothing without.
 */
const typeNameOf = (row: Row): string => {
    const label = contractTypeLabel(row.contract_type);
    const { barrier, high_barrier, low_barrier } = row.details;
    if (high_barrier && low_barrier) return `${label} ${low_barrier} – ${high_barrier}`;
    return barrier ? `${label} ${barrier}` : label;
};

/**
 * The drawer's toggle mark — the pair the bots' run panel uses, each on the
 * breakpoint they use it on.
 *
 * Desktop gets the paired chevron, turned to face the way the panel travels:
 * left to pull it out, right to send it back. That is the rotation their Drawer
 * applies to a right-anchored panel — 180 degrees closed, none open.
 *
 * Mobile gets the handle, which they flip 180 degrees once the drawer is up. It
 * is a grip rather than an arrow, which is the point: the mobile drawer is
 * dragged up, not pointed at.
 */
const Arrow = ({ open, mobile }: { open: boolean; mobile?: boolean }) =>
    mobile ? (
        <LegacyHandleLessIcon
            iconSize='sm'
            fill='currentColor'
            className='text-slate-400 transition-transform duration-300'
            style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
    ) : (
        <LabelPairedChevronsRightCaptionRegularIcon
            fill='currentColor'
            className='text-cyan-400 transition-transform duration-300'
            style={{ transform: open ? 'none' : 'rotate(180deg)' }}
        />
    );

/** One statistics tile. Three across, two rows — the run panel's grid. */
const Tile = ({ title, value, tone }: { title: string; value: string; tone?: string }) => (
    <div className='flex flex-col gap-0.5 rounded-lg border border-line bg-ink-800 px-2.5 py-2'>
        <span className='text-[9px] font-semibold uppercase tracking-wide text-slate-500'>{title}</span>
        <span className={`text-xs font-bold ${tone ?? 'text-white'}`}>{value}</span>
    </div>
);

/**
 * A figure that is not knowable yet — the bar the bots' run panel holds in the
 * same places. A dash would say the contract has no such figure; this says it
 * does not have it yet, which is a different thing.
 */
const Pending = ({ className = 'w-10' }: { className?: string }) => (
    <span className={`inline-block h-2.5 animate-pulse rounded bg-ink-700 ${className}`} />
);

/**
 * One end of a contract. A filled dot opens it and a hollow one closes it —
 * the marks the bots' run panel uses, and the reason the two lines need no
 * labels of their own in a column this narrow.
 */
const Spot = ({ entry, value, pending }: { entry: boolean; value?: string; pending: boolean }) => (
    <span
        className='flex items-center gap-1 text-[11px] tabular-nums text-slate-300'
        title={entry ? 'Entry spot' : 'Exit spot'}
    >
        {entry ? (
            <LegacyRadioOnIcon height={10} width={10} className='shrink-0' />
        ) : (
            <LegacyRadioOffIcon height={10} width={10} className='shrink-0' />
        )}
        {value ? <span className='truncate'>{value}</span> : pending ? <Pending /> : <span>—</span>}
    </span>
);

/** One line of an expanded row. Rendered only when there is a value for it. */
const Detail = ({ label, value }: { label: string; value?: string | number }) =>
    value == null || value === '' ? null : (
        <div className='flex items-baseline justify-between gap-3'>
            <span className='shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500'>{label}</span>
            <span className='min-w-0 break-words text-right text-[11px] text-slate-200'>{value}</span>
        </div>
    );

interface TransactionProps {
    row: Row;
    expanded: boolean;
    onToggle: () => void;
    onSell: (id: number) => void;
    selling: boolean;
    currency: string;
}

/**
 * One transaction. The summary is the whole row, and tapping it opens the rest
 * underneath — the market, the times and the reference ids, which are what you
 * go looking for after the fact and never while scanning the list.
 *
 * The summary is a single button rather than a row of them, so it is one tab
 * stop and one target; Sell lives in the opened half for the same reason.
 */
const Transaction = ({ row, expanded, onToggle, onSell, selling, currency }: TransactionProps) => {
    const { details: d } = row;
    const spots = spotsOf(d, !row.isOpen);
    const up = row.profit >= 0;
    const panelId = `transaction-${row.contract_id}`;

    return (
        <div
            className={`overflow-hidden rounded-xl border bg-ink-800 ${
                row.isOpen ? 'border-cyan-500/40' : 'border-line'
            }`}
        >
            <button
                type='button'
                onClick={onToggle}
                aria-expanded={expanded}
                aria-controls={panelId}
                className={`${GRID} w-full grid-rows-2 px-2.5 py-2 text-left transition-colors hover:bg-ink-700/60`}
            >
                {/* Type — the market and the contract as their own marks, down the
                    left of both lines. Each carries its name as a title, and both
                    are spelled out in the half below. */}
                {/* Drawn at one size, set here rather than asked of each icon: the
                    market marks are illustrations and the trade-type ones are
                    glyphs, and at their natural sizes the pair reads as one icon
                    and an afterthought beside it. */}
                <span className='col-start-1 row-span-2 row-start-1 flex items-center gap-1.5 [&_svg]:h-5 [&_svg]:w-5'>
                    <span className='flex shrink-0 items-center' title={row.market}>
                        <MarketIcon type={row.symbol || ''} />
                    </span>
                    <TradeTypeIcon type={row.contract_type} label={typeNameOf(row)} />
                </span>

                <span className='col-start-2 row-start-1'>
                    <Spot entry value={spots.entry} pending={row.isOpen} />
                </span>
                <span className='col-start-3 row-start-1 text-right text-[11px] font-semibold tabular-nums text-white'>
                    {row.stake.toFixed(2)} {currency}
                </span>

                <span className='col-start-2 row-start-2'>
                    <Spot entry={false} value={spots.exit} pending={row.isOpen} />
                </span>
                {/* A running contract's P/L swings between loss and profit on every
                    tick and settles at neither, so the row reports none until it is
                    final — the run panel holds the same bar there, for the same
                    reason. The live figure is still a tap away, under Current value. */}
                {row.isOpen ? (
                    <span className='col-start-3 row-start-2 flex justify-end'>
                        <Pending className='w-12' />
                    </span>
                ) : (
                    <span
                        className={`col-start-3 row-start-2 text-right text-xs font-bold tabular-nums ${
                            up ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                    >
                        {fmtSigned(row.profit)} {currency}
                    </span>
                )}

                <ChevronDown
                    size={14}
                    className={`col-start-4 row-span-2 row-start-1 shrink-0 text-slate-500 transition-transform duration-200 ${
                        expanded ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {expanded && (
                <div id={panelId} className='flex flex-col gap-1.5 border-t border-line bg-ink-900/60 px-3 py-2.5'>
                    <Detail label='Market' value={row.market} />
                    <Detail label='Trade type' value={typeNameOf(row)} />
                    <Detail label='Duration' value={d.tick_count ? `${d.tick_count} ticks` : undefined} />
                    <Detail label='Start time' value={fmtDateTime(d.date_start)} />
                    <Detail label='Entry spot time' value={fmtDateTime(d.entry_tick_time)} />
                    <Detail label='Exit time' value={fmtDateTime(exitTimeOf(d) ?? row.time)} />
                    {row.isOpen && <Detail label='Current value' value={`${(row.value ?? 0).toFixed(2)} ${currency}`} />}
                    <Detail label='Reference (buy)' value={d.transaction_ids?.buy} />
                    <Detail label='Reference (sell)' value={d.transaction_ids?.sell} />

                    {/* Selling is only possible while the contract is live, and it is
                        an action rather than a figure — so it sits here, under the
                        detail it acts on, and not in the summary line. */}
                    {row.isOpen && (
                        <button
                            type='button'
                            onClick={() => onSell(row.contract_id)}
                            disabled={selling}
                            className='mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1.5 text-[11px] font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50'
                        >
                            {selling ? <Loader2 size={12} className='animate-spin' /> : <X size={12} />}
                            Sell at market
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

const PositionsDrawer = () => {
    const { openPositions, history, sessionStats, clearHistory } = usePortfolio();
    const { isRunning, stop: stopBot } = useBotRun();
    const { balanceCurrency } = useAuth();
    const isDesktop = useIsDesktop();
    const currency = balanceCurrency || getActiveCurrency();

    const [open, setOpen] = useState(false);
    const [selling, setSelling] = useState<Record<number, boolean>>({});
    /** One row open at a time: the detail is a lookup, not a comparison. */
    const [expanded, setExpanded] = useState<number | null>(null);

    /*
     * The mobile tab bar is fixed to the bottom of the viewport, so the panel has
     * to stop above it or the collapsed handle covers the middle of it. Measured
     * rather than hardcoded: the bar's height comes from its own content plus the
     * safe-area inset, which differs per device.
     */
    const [navHeight, setNavHeight] = useState(0);
    useEffect(() => {
        const measure = () => {
            const nav = document.querySelector<HTMLElement>('[data-bottom-nav]');
            // `md:hidden`, so on desktop it has no box at all and the panel runs
            // to the bottom of the viewport.
            setNavHeight(nav ? nav.getBoundingClientRect().height : 0);
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [isDesktop]);

    /*
     * Opens itself whenever a NEW trade appears. Positions already open when the
     * panel first mounts are seeded silently, so it doesn't pop on load.
     *
     * It deliberately never closes itself. The panel carries the session's
     * transactions and statistics, and the moment the last contract settles is
     * exactly when those are worth reading — closing then would take them off
     * screen at the worst possible time.
     */
    const seenRef = useRef<Set<number>>(new Set());
    const firstRunRef = useRef(true);
    useEffect(() => {
        let hasNew = false;
        for (const p of openPositions) {
            if (!seenRef.current.has(p.contract_id)) {
                seenRef.current.add(p.contract_id);
                hasNew = true;
            }
        }
        if (firstRunRef.current) {
            firstRunRef.current = false;
            return;
        }
        if (hasNew) setOpen(true);
    }, [openPositions]);

    /* Open contracts first, then the closed ones newest-first. Both stores are
       already in that order, and an open contract is by definition newer than
       anything that has settled, so concatenating them is the whole sort. */
    const rows: Row[] = [...openPositions.map(openRow), ...history.map(closedRow)];

    const onSell = async (id: number) => {
        setSelling(s => ({ ...s, [id]: true }));
        await sellContract(id); // the portfolio stream removes it once sold
        setSelling(s => ({ ...s, [id]: false }));
    };

    const { totalProfit } = sessionStats;

    /* Stretched between fixed edges rather than sized, so the collapsed state is
       one transform away and the open state needs no height of its own. */
    const geometry: React.CSSProperties = isDesktop
        ? {
              top: HEADER,
              bottom: 0,
              right: 0,
              width: PANEL,
              transform: open ? 'none' : `translateX(${PANEL - TOGGLE}px)`,
          }
        : {
              top: HEADER,
              bottom: navHeight,
              left: 0,
              right: 0,
              transform: open ? 'none' : `translateY(calc(100% - ${HANDLE}px))`,
          };

    return (
        <>
            {/* Backdrop, mobile only — on desktop the page stays usable beside the panel.
                Stops where the tab bar starts, so the tabs are neither dimmed nor
                swallowed while the panel is open. */}
            <div
                onClick={() => setOpen(false)}
                style={{ bottom: navHeight }}
                className={`fixed inset-x-0 top-16 z-30 bg-black/50 transition-opacity duration-300 md:hidden ${
                    open ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
            />

            <aside
                style={geometry}
                className='fixed z-40 flex flex-col bg-ink-900 transition-transform duration-300 md:flex-row'
            >
                {/* The toggle: a strip down the left edge on desktop, a bar across
                    the top on mobile. The only way in or out — the bots' run panel
                    has no close button either.

                    Desktop carries the same mark as the panel header plus the number
                    of trades in it, rather than a word set on its side — turned text
                    is hard to read and harder to recognise as a control. The mark
                    matches the one in the header the strip opens, which is what ties
                    the two together. */}
                <button
                    type='button'
                    onClick={() => setOpen(v => !v)}
                    title={open ? 'Hide transactions' : 'Transactions'}
                    aria-label={open ? 'Close transactions panel' : 'Open transactions panel'}
                    style={isDesktop ? { width: TOGGLE } : { height: HANDLE }}
                    className='flex shrink-0 items-center justify-center gap-2 border-b border-line bg-ink-800 px-3 text-slate-400 transition-colors hover:text-cyan-400 md:flex-col md:px-0 md:border-x md:border-b-0'
                >
                    {isDesktop ? (
                        <>
                            {/* Dropped once the panel is out — the header two
                                centimetres away already carries both. */}
                            {!open && (
                                <>
                                    <ListChecks size={16} className='text-cyan-400' />
                                    {rows.length > 0 && (
                                        <span className='rounded-full bg-ink-700 px-1 text-[10px] font-bold leading-[1.6] text-slate-300'>
                                            {rows.length}
                                        </span>
                                    )}
                                </>
                            )}
                            <Arrow open={open} />
                        </>
                    ) : (
                        <>
                            {!open && (
                                <>
                                    <ListChecks size={15} className='text-cyan-400' />
                                    <span className='text-xs font-bold text-slate-300'>Transactions</span>
                                </>
                            )}
                            {!open && rows.length > 0 && (
                                <span
                                    className={`text-xs font-bold ${
                                        totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                >
                                    {fmtSigned(totalProfit)} {currency}
                                </span>
                            )}
                            {/* Right of the bar while a label sits beside it; centred
                                once the panel is up and it is the only thing on the bar,
                                which is where the bots keep it. An auto margin takes all
                                the free space, so it beats the centring while it is set. */}
                            <span className={`flex items-center${open ? '' : ' ml-auto'}`}>
                                <Arrow open={open} mobile />
                            </span>
                        </>
                    )}
                </button>

                <div className='flex min-h-0 flex-1 flex-col md:border-l md:border-line'>
                    {/* Header — title and Reset. */}
                    <div className='flex shrink-0 items-center justify-between border-b border-line px-4 py-3'>
                        <h2 className='flex items-center gap-2 text-sm font-bold text-white'>
                            <ListChecks size={18} className='text-cyan-400' /> Transactions
                        </h2>
                        <div className='flex items-center gap-2'>
                            {/* Only while a bot is actually running — there is nothing to
                                start from here, so the pair would be misleading. */}
                            {isRunning && (
                                <button
                                    type='button'
                                    onClick={stopBot}
                                    className='flex items-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-500/10 px-2.5 py-1.5 text-xs font-bold text-rose-300 transition-all hover:bg-rose-500/20'
                                >
                                    <Square size={11} fill='currentColor' /> Stop
                                </button>
                            )}
                            {/* Clears the session history, and with it the statistics below.
                                Open contracts are live on Deriv and cannot be cleared — same
                                as the bots, where Reset leaves the running one alone. */}
                            <button
                                type='button'
                                onClick={clearHistory}
                                disabled={history.length === 0}
                                className='flex items-center gap-1.5 rounded-lg border border-line bg-ink-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition-all hover:border-rose-500/50 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-slate-300'
                            >
                                <RotateCcw size={13} /> Reset
                            </button>
                        </div>
                    </div>

                    {/* Column labels, above the scroll rather than inside it, so they
                        stay put while the list moves under them. */}
                    {rows.length > 0 && (
                        <div
                            className={`${GRID} shrink-0 border-b border-line px-3 py-2 text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-500`}
                        >
                            <span>Type</span>
                            <span>Entry/Exit spot</span>
                            <span className='text-right'>Buy price and P/L</span>
                            <span />
                        </div>
                    )}

                    {/* `min-h-0` so this scrolls instead of stretching the panel and
                        pushing the statistics off the bottom. */}
                    <div className='flex min-h-0 flex-1 flex-col overflow-y-auto p-3'>
                        {rows.length === 0 ? (
                            <div className='flex min-h-[10rem] flex-1 flex-col items-center justify-center text-center'>
                                <span className='flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-800 text-slate-500'>
                                    <ListChecks size={26} />
                                </span>
                                <p className='mt-4 text-sm text-slate-400'>No trades this session.</p>
                                <p className='mt-1 text-xs text-slate-600'>
                                    Trades you place — manual or bot — appear here live.
                                </p>
                            </div>
                        ) : (
                            <div className='flex flex-col gap-2'>
                                {rows.map(r => (
                                    <Transaction
                                        key={r.contract_id}
                                        row={r}
                                        currency={currency}
                                        expanded={expanded === r.contract_id}
                                        onToggle={() =>
                                            setExpanded(id => (id === r.contract_id ? null : r.contract_id))
                                        }
                                        onSell={onSell}
                                        selling={!!selling[r.contract_id]}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Statistics, over the trades that have closed this session. */}
                    <div className='grid shrink-0 grid-cols-3 gap-2 border-t border-line p-3'>
                        <Tile title='Total stake' value={`${sessionStats.totalStake.toFixed(2)} ${currency}`} />
                        <Tile title='Total payout' value={`${sessionStats.totalPayout.toFixed(2)} ${currency}`} />
                        <Tile title='No. of runs' value={String(sessionStats.runs)} />
                        <Tile title='Contracts lost' value={String(sessionStats.lost)} />
                        <Tile title='Contracts won' value={String(sessionStats.won)} />
                        <Tile
                            title='Total P/L'
                            value={`${fmtSigned(totalProfit)} ${currency}`}
                            tone={totalProfit > 0 ? 'text-emerald-400' : totalProfit < 0 ? 'text-rose-400' : undefined}
                        />
                    </div>
                </div>
            </aside>
        </>
    );
};

export default PositionsDrawer;
