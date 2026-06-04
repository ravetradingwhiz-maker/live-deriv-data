import { useEffect, useState } from 'react';
import { Loader2, Plus, RefreshCw, Save, Search, Trash2, Users } from 'lucide-react';
import {
    createSubscription,
    deleteSubscription,
    listSubscriptions,
    updateSubscription,
    type AdminSubscription,
} from '@/services/admin-api';
import type { Tier } from '@/services/payments-api';

const TIERS: Tier[] = ['alpha', 'quantum', 'apex'];
const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString() : '—');
const toDateInput = (s?: string) => (s ? new Date(s).toISOString().slice(0, 10) : '');

const AdminSubscriptions = () => {
    const [rows, setRows] = useState<AdminSubscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Create form
    const [newLoginid, setNewLoginid] = useState('');
    const [newTier, setNewTier] = useState<Tier>('alpha');
    const [newMonths, setNewMonths] = useState<number | ''>('');
    const [newEmail, setNewEmail] = useState('');

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            setRows(await listSubscriptions({ q: q || undefined, status: statusFilter || undefined }));
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

    const onCreate = async () => {
        if (!newLoginid.trim()) return;
        setBusy('create');
        setError(null);
        try {
            await createSubscription({
                loginids: newLoginid
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean),
                tier: newTier,
                months: newMonths === '' ? undefined : Number(newMonths),
                email: newEmail.trim() || undefined,
            });
            setNewLoginid('');
            setNewEmail('');
            setNewMonths('');
            await load();
        } catch (e: any) {
            setError(e?.message ?? 'Create failed');
        } finally {
            setBusy(null);
        }
    };

    const patch = async (id: string, p: Parameters<typeof updateSubscription>[1]) => {
        setBusy(id);
        setError(null);
        try {
            const updated = await updateSubscription(id, p);
            setRows(rs => rs.map(r => (r._id === id ? updated : r)));
        } catch (e: any) {
            setError(e?.message ?? 'Update failed');
        } finally {
            setBusy(null);
        }
    };

    const remove = async (id: string) => {
        setBusy(id);
        try {
            await deleteSubscription(id);
            setRows(rs => rs.filter(r => r._id !== id));
        } catch (e: any) {
            setError(e?.message ?? 'Delete failed');
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className='flex w-full flex-col gap-4'>
            <div className='flex items-center justify-between'>
                <h1 className='flex items-center gap-2 text-lg font-bold text-white'>
                    <Users size={20} className='text-cyan-400' /> Subscriptions
                </h1>
                <button onClick={load} className='flex items-center gap-1.5 text-xs text-slate-400 hover:text-white'>
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* Grant new */}
            <div className='card grid gap-2 sm:grid-cols-5'>
                <input
                    value={newLoginid}
                    onChange={e => setNewLoginid(e.target.value)}
                    placeholder='Loginids (comma-sep)'
                    className='rounded-lg border border-line bg-ink-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500'
                />
                <select
                    value={newTier}
                    onChange={e => setNewTier(e.target.value as Tier)}
                    className='rounded-lg border border-line bg-ink-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500'
                >
                    {TIERS.map(t => (
                        <option key={t} value={t}>
                            {t}
                        </option>
                    ))}
                </select>
                <input
                    type='number'
                    value={newMonths}
                    onChange={e => setNewMonths(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder='Months'
                    className='rounded-lg border border-line bg-ink-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500'
                />
                <input
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder='Email (optional)'
                    className='rounded-lg border border-line bg-ink-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500'
                />
                <button
                    onClick={onCreate}
                    disabled={busy === 'create' || !newLoginid.trim()}
                    className='btn-admin'
                >
                    {busy === 'create' ? <Loader2 size={16} className='animate-spin' /> : <Plus size={16} />} Grant
                </button>
            </div>

            {/* Search */}
            <div className='flex gap-2'>
                <div className='flex flex-1 items-center gap-2 rounded-lg border border-line bg-ink-800 px-3'>
                    <Search size={15} className='text-slate-500' />
                    <input
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && load()}
                        placeholder='Search loginid or email'
                        className='flex-1 bg-transparent py-2 text-sm text-white outline-none'
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className='rounded-lg border border-line bg-ink-800 px-3 text-sm text-white outline-none'
                >
                    <option value=''>All</option>
                    <option value='active'>Active</option>
                    <option value='expired'>Expired</option>
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
                <p className='py-10 text-center text-sm text-slate-500'>No subscriptions.</p>
            ) : (
                <div className='flex flex-col gap-2'>
                    {rows.map(r => (
                        <div key={r._id} className='card flex flex-wrap items-center gap-3'>
                            <div className='min-w-0 flex-1'>
                                <p className='truncate text-sm font-semibold text-white'>{r.loginids.join(', ')}</p>
                                <p className='truncate text-[11px] text-slate-500'>{r.email || 'no email'}</p>
                            </div>
                            <select
                                value={r.tier}
                                onChange={e => patch(r._id, { tier: e.target.value as Tier })}
                                className='rounded-lg border border-line bg-ink-800 px-2 py-1.5 text-xs text-white outline-none'
                            >
                                {TIERS.map(t => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={r.status}
                                onChange={e => patch(r._id, { status: e.target.value as 'active' | 'expired' })}
                                className={`rounded-lg border border-line bg-ink-800 px-2 py-1.5 text-xs outline-none ${
                                    r.status === 'active' ? 'text-emerald-400' : 'text-slate-400'
                                }`}
                            >
                                <option value='active'>active</option>
                                <option value='expired'>expired</option>
                            </select>
                            <input
                                type='date'
                                defaultValue={toDateInput(r.expiresAt)}
                                onChange={e =>
                                    e.target.value &&
                                    patch(r._id, { expiresAt: new Date(e.target.value).toISOString() })
                                }
                                className='rounded-lg border border-line bg-ink-800 px-2 py-1.5 text-xs text-white outline-none'
                                title={`Expires ${fmtDate(r.expiresAt)}`}
                            />
                            <button
                                onClick={() => remove(r._id)}
                                disabled={busy === r._id}
                                className='flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 disabled:opacity-50'
                            >
                                {busy === r._id ? <Loader2 size={14} className='animate-spin' /> : <Trash2 size={14} />}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <p className='flex items-center gap-1.5 text-[11px] text-slate-600'>
                <Save size={12} /> Tier, status and expiry changes save instantly.
            </p>
        </div>
    );
};

export default AdminSubscriptions;
