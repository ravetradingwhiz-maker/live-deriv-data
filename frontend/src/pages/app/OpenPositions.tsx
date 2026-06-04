import { useState } from 'react';
import { Briefcase, Loader2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePortfolio } from '@/context/PortfolioContext';
import { getActiveCurrency, sellContract } from '@/services/trade-api';
import { contractTypeLabel, fmtSigned } from '@/utils/contract-format';

const OpenPositions = () => {
    const { balanceCurrency } = useAuth();
    const { openPositions } = usePortfolio();
    const currency = balanceCurrency || getActiveCurrency();

    const [selling, setSelling] = useState<Record<number, boolean>>({});

    const totalProfit = openPositions.reduce((sum, p) => sum + (Number(p.profit) || 0), 0);

    const onSell = async (id: number) => {
        setSelling(s => ({ ...s, [id]: true }));
        await sellContract(id); // the portfolio stream removes it once sold
        setSelling(s => ({ ...s, [id]: false }));
    };

    return (
        <div className='flex w-full flex-col gap-4'>
            <div className='flex items-center justify-between'>
                <h1 className='flex items-center gap-2 text-lg font-bold text-white'>
                    <Briefcase size={20} className='text-cyan-400' /> Open Positions
                </h1>
                {openPositions.length > 0 && (
                    <span className={`text-sm font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {fmtSigned(totalProfit)} {currency}
                    </span>
                )}
            </div>

            {openPositions.length === 0 ? (
                <div className='flex min-h-[40vh] flex-col items-center justify-center text-center'>
                    <span className='flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-800 text-slate-500'>
                        <Briefcase size={26} />
                    </span>
                    <p className='mt-4 text-sm text-slate-400'>No open positions right now.</p>
                    <p className='mt-1 text-xs text-slate-600'>Trades you place — manual or bot — appear here live.</p>
                </div>
            ) : (
                <div className='flex flex-col gap-2'>
                    {openPositions.map(p => {
                        const profit = Number(p.profit) || 0;
                        const up = profit >= 0;
                        return (
                            <div
                                key={p.contract_id}
                                className='flex items-center gap-3 rounded-xl border border-line bg-ink-800 p-3'
                            >
                                <div className='min-w-0 flex-1'>
                                    <div className='flex items-center gap-2'>
                                        <span className='rounded bg-ink-700 px-2 py-0.5 text-xs font-bold text-cyan-300'>
                                            {contractTypeLabel(p.contract_type)}
                                        </span>
                                        <span className='truncate text-sm font-semibold text-white'>
                                            {p.display_name || p.underlying || '—'}
                                        </span>
                                    </div>
                                    <p className='mt-0.5 text-[11px] text-slate-500'>
                                        Stake {Number(p.buy_price ?? 0).toFixed(2)} {currency} · Value{' '}
                                        {Number(p.bid_price ?? 0).toFixed(2)}
                                    </p>
                                </div>

                                <div className='text-right'>
                                    <p className={`text-sm font-bold ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {fmtSigned(profit)}
                                    </p>
                                    <p className='text-[10px] text-slate-500'>{currency}</p>
                                </div>

                                <button
                                    type='button'
                                    onClick={() => onSell(p.contract_id)}
                                    disabled={!!selling[p.contract_id]}
                                    className='flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300 transition-all hover:bg-rose-500/20 disabled:opacity-50'
                                >
                                    {selling[p.contract_id] ? (
                                        <Loader2 size={13} className='animate-spin' />
                                    ) : (
                                        <X size={13} />
                                    )}
                                    Sell
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default OpenPositions;
