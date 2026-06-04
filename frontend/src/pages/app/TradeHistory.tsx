import { History, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePortfolio } from '@/context/PortfolioContext';
import { getActiveCurrency } from '@/services/trade-api';
import { contractTypeLabel, fmtSigned, fmtTime } from '@/utils/contract-format';

const TradeHistory = () => {
    const { balanceCurrency } = useAuth();
    const { history, clearHistory } = usePortfolio();
    const currency = balanceCurrency || getActiveCurrency();

    const totalProfit = history.reduce((sum, t) => sum + (Number(t.profit) || 0), 0);

    return (
        <div className='flex w-full flex-col gap-4'>
            <div className='flex items-center justify-between'>
                <h1 className='flex items-center gap-2 text-lg font-bold text-white'>
                    <History size={20} className='text-cyan-400' /> Trade History
                </h1>
                {history.length > 0 && (
                    <button
                        type='button'
                        onClick={clearHistory}
                        className='flex items-center gap-1.5 rounded-lg border border-line bg-ink-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition-all hover:border-rose-500/50 hover:text-rose-300'
                    >
                        <Trash2 size={13} /> Clear
                    </button>
                )}
            </div>

            {history.length > 0 && (
                <div className='flex items-center justify-between rounded-lg border border-line bg-ink-800/60 px-3 py-2 text-xs'>
                    <span className='text-slate-400'>Session P/L · {history.length} trades</span>
                    <span className={`font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {fmtSigned(totalProfit)} {currency}
                    </span>
                </div>
            )}

            {history.length === 0 ? (
                <div className='flex min-h-[40vh] flex-col items-center justify-center text-center'>
                    <span className='flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-800 text-slate-500'>
                        <History size={26} />
                    </span>
                    <p className='mt-4 text-sm text-slate-400'>No trades this session.</p>
                    <p className='mt-1 text-xs text-slate-600'>Closed trades appear here until you reload or clear.</p>
                </div>
            ) : (
                <div className='flex flex-col gap-2'>
                    {history.map(t => {
                        const won = t.profit >= 0;
                        return (
                            <div
                                key={t.contract_id}
                                className='flex items-center gap-3 rounded-xl border border-line bg-ink-800 p-3'
                            >
                                <div className='min-w-0 flex-1'>
                                    <div className='flex items-center gap-2'>
                                        <span className='rounded bg-ink-700 px-2 py-0.5 text-xs font-bold text-slate-300'>
                                            {contractTypeLabel(t.contract_type)}
                                        </span>
                                        <span className='truncate text-sm font-semibold text-white'>{t.market}</span>
                                    </div>
                                    <p className='mt-0.5 text-[11px] text-slate-500'>
                                        {fmtTime(t.time)} · Stake {t.buy_price.toFixed(2)} {currency}
                                    </p>
                                </div>
                                <div className='text-right'>
                                    <p className={`text-sm font-bold ${won ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {fmtSigned(t.profit)}
                                    </p>
                                    <p className='text-[10px] text-slate-500'>{currency}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TradeHistory;
