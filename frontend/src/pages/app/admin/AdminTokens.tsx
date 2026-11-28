import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, KeyRound, Loader2, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import { deactivateToken, deleteToken, fetchTokens, type AccessToken } from '@/services/qv-admin';

/**
 * The access tokens that let someone into the bots, read from the vault.
 *
 * They are issued and stored there, so this page is a window onto that list
 * rather than a second copy of it. It can retire a token and it can delete
 * one; issuing is left where it already happens, because a token is only
 * useful to whoever is handed it.
 */

const fmtDate = (v?: string | null) =>
    v
        ? new Date(v).toLocaleString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : '—';

/** Live, spent, or retired — one word, because that is the whole question. */
const stateOf = (t: AccessToken): { label: string; tone: string } => {
    if (t.isActive === false) return { label: 'Retired', tone: 'text-slate-500' };
    if (t.isUsed) return { label: 'Used', tone: 'text-amber-300' };
    if (t.expiresAt && new Date(t.expiresAt).getTime() < Date.now())
        return { label: 'Expired', tone: 'text-rose-300' };
    return { label: 'Active', tone: 'text-emerald-300' };
};

const AdminTokens = () => {
    const { adminLoginid } = useAdmin();
    const [tokens, setTokens] = useState<AccessToken[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<Record<string, boolean>>({});
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        if (!adminLoginid) return;
        setLoading(true);
        setError('');
        try {
            const body = await fetchTokens(adminLoginid);
            const list = body.tokens ?? body.data ?? [];
            setTokens(Array.isArray(list) ? list : []);
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
        try {
            await fn();
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'That did not work.');
        } finally {
            setBusy(b => ({ ...b, [id]: false }));
        }
    };

    return (
        <div className='space-y-6'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                    <h1 className='flex items-center gap-2 text-xl font-extrabold text-white'>
                        <KeyRound size={20} className='text-amber-400' /> Tokens
                    </h1>
                    <p className='mt-0.5 text-xs text-slate-500'>
                        Access tokens held in the vault — {tokens.length} in total
                    </p>
                </div>
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

            {error && (
                <div className='flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-300'>
                    <AlertCircle size={18} className='mt-0.5 shrink-0' />
                    <p className='text-sm'>{error}</p>
                </div>
            )}

            {loading && !tokens.length ? (
                <div className='flex justify-center py-16 text-slate-600'>
                    <Loader2 size={26} className='animate-spin' />
                </div>
            ) : tokens.length === 0 ? (
                <div className='card text-center'>
                    <p className='text-sm text-slate-400'>No tokens yet.</p>
                    <p className='mt-1 text-xs text-slate-600'>Tokens issued in the vault appear here.</p>
                </div>
            ) : (
                <div className='card overflow-hidden p-0'>
                    <div className='overflow-x-auto'>
                        <table className='w-full text-sm'>
                            <thead className='bg-ink-800/60 text-[11px] uppercase tracking-wider text-slate-500'>
                                <tr>
                                    <th className='px-4 py-2.5 text-left font-semibold'>Token</th>
                                    <th className='px-4 py-2.5 text-left font-semibold'>State</th>
                                    <th className='px-4 py-2.5 text-left font-semibold'>Created</th>
                                    <th className='px-4 py-2.5 text-left font-semibold'>Expires</th>
                                    <th className='px-4 py-2.5 text-right font-semibold'>Actions</th>
                                </tr>
                            </thead>
                            <tbody className='divide-y divide-line'>
                                {tokens.map(t => {
                                    const state = stateOf(t);
                                    const working = !!busy[t._id];
                                    return (
                                        <tr key={t._id} className='text-slate-200'>
                                            <td className='px-4 py-3'>
                                                <span className='font-mono text-xs text-white'>
                                                    {t.token ?? t.label ?? t.name ?? t._id}
                                                </span>
                                                {t.site && (
                                                    <span className='ml-2 text-[11px] text-slate-500'>{t.site}</span>
                                                )}
                                            </td>
                                            <td className={`px-4 py-3 font-semibold ${state.tone}`}>{state.label}</td>
                                            <td className='px-4 py-3 text-xs text-slate-400'>{fmtDate(t.createdAt)}</td>
                                            <td className='px-4 py-3 text-xs text-slate-400'>{fmtDate(t.expiresAt)}</td>
                                            <td className='px-4 py-3'>
                                                <div className='flex items-center justify-end gap-2'>
                                                    {t.isActive !== false && (
                                                        <button
                                                            type='button'
                                                            disabled={working}
                                                            onClick={() =>
                                                                void act(t._id, () =>
                                                                    deactivateToken(adminLoginid ?? '', t._id)
                                                                )
                                                            }
                                                            className='flex items-center gap-1 rounded-lg border border-line bg-ink-800 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:text-amber-300 disabled:opacity-50'
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
                                                        className='flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50'
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
