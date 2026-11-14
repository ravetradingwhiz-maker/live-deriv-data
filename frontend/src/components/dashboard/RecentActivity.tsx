import { FileClock } from 'lucide-react';
import type { ProfitTableRow } from '@/services/trade-api';
import { rowProfit } from '@/utils/growth';

interface RecentActivityProps {
    /** The month's settled trades, newest first. */
    rows: ProfitTableRow[];
    currency: string;
    loading: boolean;
    limit?: number;
}

const fmtMoney = (value: number, currency: string): string => {
    const body = Math.abs(value).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return `${value >= 0 ? '+' : '-'}${body} ${currency}`;
};

const fmtWhen = (seconds: number): string =>
    new Date(seconds * 1000).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

/**
 * The last few settled trades.
 *
 * Reads the same profit table the figures above come from, so the list and the
 * month's totals can never disagree — and so it survives a reload, which the
 * in-memory session history does not.
 */
const RecentActivity = ({ rows, currency, loading, limit = 5 }: RecentActivityProps) => {
    if (loading) {
        return (
            <ul className='divide-y divide-line' aria-busy='true' aria-label='Recent activity loading'>
                {Array.from({ length: 3 }, (_, i) => (
                    <li key={i} className='flex items-center justify-between gap-3 py-3'>
                        <div className='min-w-0 flex-1 space-y-1.5'>
                            <div className='h-3.5 w-3/4 animate-pulse rounded bg-ink-600' />
                            <div className='h-2.5 w-20 animate-pulse rounded bg-ink-600' />
                        </div>
                        <div className='h-3.5 w-16 shrink-0 animate-pulse rounded bg-ink-600' />
                    </li>
                ))}
            </ul>
        );
    }

    if (rows.length === 0) {
        return (
            <div className='flex flex-col items-center justify-center py-10 text-center'>
                <span className='flex h-16 w-16 items-center justify-center rounded-full bg-cyan-300/10'>
                    <FileClock size={26} className='text-cyan-300' />
                </span>
                <p className='mt-3 text-sm font-semibold text-white'>No recent activity</p>
                <p className='mt-1 text-xs text-slate-500'>Your activity will appear here.</p>
            </div>
        );
    }

    return (
        <ul className='divide-y divide-line'>
            {rows.slice(0, limit).map(row => {
                const profit = rowProfit(row);
                return (
                    <li key={row.contract_id} className='flex items-center justify-between gap-3 py-3'>
                        {/* flex-1 with min-w-0 is what lets the contract name
                            truncate instead of setting the row's width. */}
                        <div className='min-w-0 flex-1'>
                            <p className='truncate text-sm text-slate-300'>{row.longcode}</p>
                            <p className='mt-0.5 text-[11px] text-slate-500'>{fmtWhen(Number(row.sell_time) || 0)}</p>
                        </div>
                        <span
                            className={`shrink-0 font-mono text-sm font-semibold ${
                                profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                        >
                            {fmtMoney(profit, currency)}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
};

export default RecentActivity;
