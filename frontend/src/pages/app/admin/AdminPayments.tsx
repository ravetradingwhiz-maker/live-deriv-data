import { useEffect, useState } from 'react';
import { CreditCard, Loader2, RefreshCw, Search } from 'lucide-react';
import { listPayments, type AdminPayment } from '@/services/admin-api';

const STATUS_STYLE: Record<string, string> = {
    paid: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
    pending: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
    expired: 'text-slate-400 border-line bg-ink-800',
    failed: 'text-rose-300 border-rose-500/40 bg-rose-500/10',
};

const fmtDateTime = (s?: string) => (s ? new Date(s).toLocaleString() : '—');

const AdminPayments = () => {
    const [rows, setRows] = useState<AdminPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            setRows(await listPayments({ q: q || undefined, status: statusFilter || undefined }));
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const paidTotal = rows.filter(r => r.status === 'paid').reduce((s, r) => s + (r.priceUSD || 0), 0);

    return (
        <div className='flex w-full flex-col gap-4'>
            <div className='flex items-center justify-between'>
                <h1 className='flex items-center gap-2 text-lg font-bold text-white'>
                    <CreditCard size={20} className='text-cyan-400' /> Payments
                </h1>
                <button onClick={load} className='flex items-center gap-1.5 text-xs text-slate-400 hover:text-white'>
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                <div className='card'>
                    <p className='text-[11px] uppercase tracking-wider text-slate-500'>Records</p>
                    <p className='mt-1 text-2xl font-extrabold text-white'>{rows.length}</p>
                </div>
                <div className='card'>
                    <p className='text-[11px] uppercase tracking-wider text-slate-500'>Paid</p>
                    <p className='mt-1 text-2xl font-extrabold text-emerald-400'>
                        {rows.filter(r => r.status === 'paid').length}
                    </p>
                </div>
                <div className='card'>
                    <p className='text-[11px] uppercase tracking-wider text-slate-500'>Paid revenue</p>
                    <p className='mt-1 text-2xl font-extrabold text-cyan-400'>${paidTotal.toFixed(2)}</p>
                </div>
            </div>

            <div className='flex flex-wrap items-center gap-2'>
                <div className='flex basis-full items-center gap-2 rounded-lg border border-line bg-ink-800 px-3 sm:basis-0 sm:flex-1'>
                    <Search size={15} className='shrink-0 text-slate-500' />
                    <input
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && load()}
                        placeholder='Search order id or email'
                        className='min-w-0 flex-1 bg-transparent py-2 text-sm text-white outline-none'
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className='flex-1 rounded-lg border border-line bg-ink-800 px-3 py-2 text-sm text-white outline-none sm:flex-none'
                >
                    <option value=''>All</option>
                    <option value='paid'>Paid</option>
                    <option value='pending'>Pending</option>
                    <option value='expired'>Expired</option>
                    <option value='failed'>Failed</option>
                </select>
                <button onClick={load} className='btn-admin'>
                    Search
                </button>
            </div>

            {error && <div className='card border-rose-500/40 text-sm text-rose-300'>{error}</div>}

            {loading ? (
                <div className='flex justify-center py-10'>
                    <Loader2 className='animate-spin text-cyan-400' />
                </div>
            ) : rows.length === 0 ? (
                <p className='py-10 text-center text-sm text-slate-500'>No payments.</p>
            ) : (
                <div className='flex flex-col gap-2'>
                    {rows.map(r => (
                        <div key={r._id} className='card flex flex-wrap items-center gap-x-4 gap-y-1'>
                            <div className='min-w-0 flex-1'>
                                <p className='truncate font-mono text-xs font-semibold text-white'>{r.orderId}</p>
                                <p className='truncate text-[11px] text-slate-500'>{r.email}</p>
                            </div>
                            <span className='text-xs font-bold uppercase text-amber-300'>{r.tier}</span>
                            <div className='text-right'>
                                <p className='text-sm font-bold text-white'>${r.priceUSD}</p>
                                <p className='text-[10px] text-slate-500'>
                                    {r.payAmount} {r.payCurrency}
                                </p>
                            </div>
                            <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                                    STATUS_STYLE[r.status] ?? STATUS_STYLE.expired
                                }`}
                            >
                                {r.status}
                            </span>
                            <p className='w-full text-[10px] text-slate-600 sm:w-auto'>
                                {fmtDateTime(r.paidAt || r.createdAt)}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminPayments;
