import { useEffect, useRef, useState } from 'react';
import { Briefcase, Loader2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePortfolio } from '@/context/PortfolioContext';
import { getActiveCurrency, sellContract } from '@/services/trade-api';
import { contractTypeLabel, fmtSigned } from '@/utils/contract-format';

/**
 * Global open-positions drawer. A floating button appears whenever the active
 * account has open contracts (from any source — manual trader or a bot); tapping
 * it slides a panel in from the right with live P&L, so you can watch positions
 * without leaving the page you're on (the bot keeps running).
 */
const PositionsDrawer = () => {
    const { openPositions } = usePortfolio();
    const { balanceCurrency } = useAuth();
    const currency = balanceCurrency || getActiveCurrency();

    const [open, setOpen] = useState(false);
    const [selling, setSelling] = useState<Record<number, boolean>>({});

    // Auto-open the drawer whenever a NEW trade appears (positions already open
    // when the drawer first mounts are seeded silently so it doesn't pop on load).
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
        // Close once everything has settled so the drawer never sits empty.
        else if (openPositions.length === 0) setOpen(false);
    }, [openPositions]);

    const count = openPositions.length;
    const totalProfit = openPositions.reduce((s, p) => s + (Number(p.profit) || 0), 0);

    // Nothing open and drawer closed → render nothing.
    if (count === 0 && !open) return null;

    const onSell = async (id: number) => {
        setSelling(s => ({ ...s, [id]: true }));
        await sellContract(id);
        setSelling(s => ({ ...s, [id]: false }));
    };

    return (
        <>
            {/* Floating trigger (hidden while drawer is open) */}
            {!open && (
                <button
                    type='button'
                    onClick={() => setOpen(true)}
                    className='fixed bottom-[5.5rem] right-4 z-50 flex items-center gap-2 rounded-full bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_22px_rgba(34,211,238,0.5)] transition-all hover:bg-cyan-500 md:bottom-6 md:right-6'
                >
                    <Briefcase size={16} />
                    Positions
                    <span className='flex h-5 min-w-5 items-center justify-center rounded-full bg-ink-900 px-1 text-xs'>
                        {count}
                    </span>
                </button>
            )}

            {/* Backdrop + drawer — sits below the header (top-16). Bottom sheet on
                mobile, right drawer on desktop. */}
            <div className={`fixed inset-x-0 bottom-0 top-16 z-30 ${open ? '' : 'pointer-events-none'}`}>
                <div
                    onClick={() => setOpen(false)}
                    className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
                        open ? 'opacity-100' : 'opacity-0'
                    }`}
                />
                <aside
                    className={`absolute inset-x-0 bottom-0 flex max-h-[80%] flex-col rounded-t-2xl border-t border-line bg-ink-900 shadow-2xl transition-transform duration-300 md:inset-x-auto md:inset-y-0 md:right-0 md:max-h-none md:w-full md:max-w-sm md:rounded-t-none md:border-l md:border-t-0 ${
                        open ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-full'
                    }`}
                >
                    <div className='flex items-center justify-between border-b border-line px-4 py-3'>
                        <h2 className='flex items-center gap-2 text-sm font-bold text-white'>
                            <Briefcase size={18} className='text-cyan-400' /> Open Positions
                        </h2>
                        <div className='flex items-center gap-3'>
                            {count > 0 && (
                                <span className={`text-sm font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {fmtSigned(totalProfit)} {currency}
                                </span>
                            )}
                            <button
                                type='button'
                                onClick={() => setOpen(false)}
                                className='flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-ink-800 hover:text-white'
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className='flex-1 overflow-y-auto p-3'>
                        <div className='flex flex-col gap-2'>
                                {openPositions.map(p => {
                                    const profit = Number(p.profit) || 0;
                                    const up = profit >= 0;
                                    return (
                                        <div
                                            key={p.contract_id}
                                            className='flex items-center gap-2 rounded-xl border border-line bg-ink-800 p-2.5'
                                        >
                                            <div className='min-w-0 flex-1'>
                                                <div className='flex items-center gap-1.5'>
                                                    <span className='rounded bg-ink-700 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300'>
                                                        {contractTypeLabel(p.contract_type)}
                                                    </span>
                                                    <span className='truncate text-xs font-semibold text-white'>
                                                        {p.display_name || p.underlying || '—'}
                                                    </span>
                                                </div>
                                                <p className='mt-0.5 text-[10px] text-slate-500'>
                                                    Stake {Number(p.buy_price ?? 0).toFixed(2)} · Value{' '}
                                                    {Number(p.bid_price ?? 0).toFixed(2)}
                                                </p>
                                            </div>
                                            <span className={`text-sm font-bold ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {fmtSigned(profit)}
                                            </span>
                                            <button
                                                type='button'
                                                onClick={() => onSell(p.contract_id)}
                                                disabled={!!selling[p.contract_id]}
                                                className='flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50'
                                            >
                                                {selling[p.contract_id] ? (
                                                    <Loader2 size={12} className='animate-spin' />
                                                ) : (
                                                    <X size={12} />
                                                )}
                                                Sell
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                    </div>
                </aside>
            </div>
        </>
    );
};

export default PositionsDrawer;
