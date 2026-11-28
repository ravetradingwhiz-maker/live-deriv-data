import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Check, Copy, KeyRound, Loader2, Plus, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import {
    createToken,
    deactivateToken,
    deleteToken,
    fetchTokens,
    TOKEN_DURATIONS,
    type AccessToken,
    type TokenDuration,
} from '@/services/qv-admin';

/**
 * The access tokens that let someone into the bots.
 *
 * They are issued, spent and retired here. The token itself is the whole
 * point of the row — it is what gets sent to a customer — so it is set in
 * monospace and copies in one click, and the confirmation happens on the
 * button rather than in a notice somewhere else on the page.
 */

const fmtDate = (v?: string | null) =>
    v
        ? new Date(v).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : 'Never';

/* One word for the state. The colour repeats what the word says, for anyone
   scanning rather than reading. */
const STATE_TONE: Record<AccessToken['status'], string> = {
    active: 'text-emerald-300',
    used: 'text-amber-300',
    expired: 'text-slate-500',
    deactivated: 'text-slate-500',
};

const CopyButton = ({ value }: { value: string }) => {
    const [done, setDone] = useState(false);
    return (
        <button
            type='button'
            title='Copy token'
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(value);
                    setDone(true);
                    setTimeout(() => setDone(false), 1400);
                } catch {
                    /* a blocked clipboard is not worth an error dialog */
                }
            }}
            className={`rounded-md p-1 transition-colors ${
                done ? 'text-emerald-400' : 'text-slate-500 hover:text-cyan-300'
            }`}
        >
            {done ? <Check size={14} /> : <Copy size={14} />}
        </button>
    );
};

const AdminTokens = () => {
    const { adminLoginid } = useAdmin();
    const [tokens, setTokens] = useState<AccessToken[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<Record<string, boolean>>({});
    const [error, setError] = useState('');

    // The new-token form.
    const [open, setOpen] = useState(false);
    const [clientName, setClientName] = useState('');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState<TokenDuration>('1month');
    const [creating, setCreating] = useState(false);

    const load = useCallback(async () => {
        if (!adminLoginid) return;
        setLoading(true);
        setError('');
        try {
            const body = await fetchTokens(adminLoginid);
            setTokens(Array.isArray(body.data) ? body.data : []);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load tokens.');
            setTokens([]);
        } finally {
            setLoading(false);
        }
    }, [adminLoginid]);

    useEffect(() => {
        void load();
    }, [load]);

    const act = async (id: string, fn: () => Promise<unknown>) => {
        setBusy(b => ({ ...b, [id]: true }));
        setError('');
        try {
            await fn();
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'That did not work.');
        } finally {
            setBusy(b => ({ ...b, [id]: false }));
        }
    };

    const create = async () => {
        if (!adminLoginid || !clientName.trim()) return;
        setCreating(true);
        setError('');
        try {
            await createToken(adminLoginid, {
                clientName: clientName.trim(),
                duration,
                description: description.trim(),
            });
            setClientName('');
            setDescription('');
            setOpen(false);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not create the token.');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className='space-y-6'>
            <div className='flex flex-wrap items-end justify-between gap-3'>
                <div>
                    <h1 className='flex items-center gap-2 text-xl font-extrabold text-white'>
                        <KeyRound size={20} className='text-amber-400' /> Tokens
                    </h1>
                    <p className='mt-0.5 text-xs text-slate-500'>
                        {tokens.length} issued · {tokens.filter(t => t.status === 'active').length} still active
                    </p>
                </div>
                <div className='flex items-center gap-2'>
                    <button
                        type='button'
                        onClick={() => setOpen(o => !o)}
                        className='btn-primary px-4 py-2 text-sm'
                    >
                        <Plus size={15} /> New token
                    </button>
                    <button
                        type='button'
                        onClick={() => void load()}
                        disabled={loading}
                        aria-label='Refresh'
                        className='rounded-lg border border-line bg-ink-800 p-2 text-slate-300 transition-colors hover:text-white disabled:opacity-50'
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {error && (
                <div className='flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-300'>
                    <AlertCircle size={18} className='mt-0.5 shrink-0' />
                    <p className='text-sm'>{error}</p>
                </div>
            )}

            {open && (
                <div className='card space-y-3'>
                    <label className='block'>
                        <span className='text-xs font-semibold text-slate-300'>Who it is for</span>
                        <input
                            type='text'
                            autoFocus
                            value={clientName}
                            onChange={e => setClientName(e.target.value)}
                            placeholder='Customer name'
                            className='mt-1 w-full rounded-lg border border-line bg-ink-800 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none'
                        />
                    </label>
                    <label className='block'>
                        <span className='text-xs font-semibold text-slate-300'>Note (optional)</span>
                        <input
                            type='text'
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder='What this token is for'
                            className='mt-1 w-full rounded-lg border border-line bg-ink-800 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none'
                        />
                    </label>
                    <div>
                        <span className='text-xs font-semibold text-slate-300'>Lasts</span>
                        <div className='mt-1 flex flex-wrap gap-2'>
                            {TOKEN_DURATIONS.map(d => (
                                <button
                                    key={d.id}
                                    type='button'
                                    onClick={() => setDuration(d.id)}
                                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                                        duration === d.id
                                            ? 'bg-cyan-600 text-white'
                                            : 'border border-line bg-ink-800 text-slate-300 hover:text-white'
                                    }`}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        type='button'
                        onClick={() => void create()}
                        disabled={creating || !clientName.trim()}
                        className='btn-primary w-full py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50'
                    >
                        {creating && <Loader2 size={15} className='animate-spin' />}
                        Create token
                    </button>
                </div>
            )}

            {loading && !tokens.length ? (
                <div className='flex justify-center py-16 text-slate-600'>
                    <Loader2 size={26} className='animate-spin' />
                </div>
            ) : tokens.length === 0 ? (
                <div className='card text-center'>
                    <p className='text-sm text-slate-400'>No tokens yet.</p>
                    <p className='mt-1 text-xs text-slate-600'>Create one to let a customer into the bots.</p>
                </div>
            ) : (
                <div className='card overflow-hidden p-0'>
                    <div className='overflow-x-auto'>
                        <table className='w-full text-sm'>
                            <thead className='bg-ink-800/60 text-[11px] uppercase tracking-wider text-slate-500'>
                                <tr>
                                    <th className='px-4 py-2.5 text-left font-semibold'>Token</th>
                                    <th className='px-4 py-2.5 text-left font-semibold'>For</th>
                                    <th className='px-4 py-2.5 text-left font-semibold'>State</th>
                                    <th className='px-4 py-2.5 text-left font-semibold'>Expires</th>
                                    <th className='px-4 py-2.5 text-right font-semibold'>Actions</th>
                                </tr>
                            </thead>
                            <tbody className='divide-y divide-line'>
                                {tokens.map(t => {
                                    const working = !!busy[t._id];
                                    const spent = t.status !== 'active';
                                    return (
                                        <tr key={t._id} className={spent ? 'text-slate-500' : 'text-slate-200'}>
                                            <td className='px-4 py-3'>
                                                <span className='flex items-center gap-1.5'>
                                                    <code className='font-mono text-sm font-bold tracking-wider text-white'>
                                                        {t.token}
                                                    </code>
                                                    <CopyButton value={t.token} />
                                                </span>
                                            </td>
                                            <td className='px-4 py-3'>
                                                <span className='font-semibold'>{t.clientName}</span>
                                                {t.description && (
                                                    <span className='block text-[11px] text-slate-500'>
                                                        {t.description}
                                                    </span>
                                                )}
                                            </td>
                                            <td className={`px-4 py-3 font-semibold ${STATE_TONE[t.status]}`}>
                                                {t.status === 'deactivated' ? 'Retired' : t.status}
                                                {t.validationCount ? (
                                                    <span className='block text-[11px] text-slate-600'>
                                                        used {t.validationCount}×
                                                    </span>
                                                ) : null}
                                            </td>
                                            <td className='px-4 py-3 text-xs'>{fmtDate(t.expiresAt)}</td>
                                            <td className='px-4 py-3'>
                                                <div className='flex items-center justify-end gap-2'>
                                                    {t.isActive && (
                                                        <button
                                                            type='button'
                                                            disabled={working}
                                                            onClick={() =>
                                                                void act(t._id, () =>
                                                                    deactivateToken(adminLoginid ?? '', t._id)
                                                                )
                                                            }
                                                            className='flex items-center gap-1 rounded-lg border border-line bg-ink-800 px-2 py-1 text-[11px] font-semibold text-slate-300 transition-colors hover:text-amber-300 disabled:opacity-50'
                                                        >
                                                            <XCircle size={12} /> Retire
                                                        </button>
                                                    )}
                                                    <button
                                                        type='button'
                                                        disabled={working}
                                                        onClick={() =>
                                                            void act(t._id, () => deleteToken(adminLoginid ?? '', t._id))
                                                        }
                                                        className='flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50'
                                                    >
                                                        {working ? (
                                                            <Loader2 size={12} className='animate-spin' />
                                                        ) : (
                                                            <Trash2 size={12} />
                                                        )}
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTokens;
