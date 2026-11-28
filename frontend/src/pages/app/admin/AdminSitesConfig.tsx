import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Loader2, Plus, Settings2, Trash2 } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import {
    addSite,
    deleteSite,
    fetchCredentials,
    saveCredentialFields,
    type CredentialField,
    type CredentialSite,
    type CredentialValue,
} from '@/services/qv-admin';

/**
 * The Deriv credentials each site reports markup under.
 *
 * They decide whether Markup Overview can see a site at all: one with no
 * markup token reports nothing and is named at the foot of that page rather
 * than counted. Sites are added and removed here now, so the list of them is
 * this collection — there is no list in the code to edit.
 *
 * Secrets never come back in full; the vault returns the last four characters.
 * So a secret's box starts empty and its current value is shown beside the
 * label as a hint — typing replaces it, leaving it alone keeps it. Identifiers
 * arrive whole and are pre-filled, because a wrong app id is impossible to
 * spot behind asterisks. Only changed fields are sent.
 */

const SITE_KEY = /^[a-z0-9][a-z0-9_-]{1,31}$/;

const valueOf = (row: CredentialSite | undefined, key: string): CredentialValue | null => {
    const v = row?.[key];
    return v && typeof v === 'object' ? (v as CredentialValue) : null;
};

const nameOf = (row: CredentialSite) => {
    const label = valueOf(row, 'label');
    return (label?.value as string) || row.site;
};

const AdminSitesConfig = () => {
    const { adminLoginid } = useAdmin();
    const [fields, setFields] = useState<CredentialField[]>([]);
    const [sites, setSites] = useState<CredentialSite[]>([]);
    const [active, setActive] = useState('');
    const [draft, setDraft] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    // Adding a site is a different job from amending one, so it has its own form.
    const [adding, setAdding] = useState(false);
    const [newKey, setNewKey] = useState('');
    const [newLabel, setNewLabel] = useState('');

    const load = useCallback(async () => {
        if (!adminLoginid) return;
        setLoading(true);
        setError('');
        try {
            const body = await fetchCredentials(adminLoginid);
            setFields(body.fields ?? []);
            setSites(body.sites ?? []);
            setActive(a => (body.sites?.some(s => s.site === a) ? a : (body.sites?.[0]?.site ?? '')));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load site credentials.');
        } finally {
            setLoading(false);
        }
    }, [adminLoginid]);

    useEffect(() => {
        void load();
    }, [load]);

    const row = useMemo(() => sites.find(s => s.site === active), [sites, active]);

    /* Switching site throws the draft away rather than carrying half a token
       from one site onto another. */
    useEffect(() => setDraft({}), [active]);

    const save = async () => {
        if (!row || !adminLoginid) return;
        const changed: Record<string, string> = {};
        for (const [key, value] of Object.entries(draft)) {
            const current = valueOf(row, key);
            // An identifier that was not touched reads back the same; only a
            // real difference is worth sending.
            if (!current?.secret && String(current?.value ?? '') === value) continue;
            changed[key] = value;
        }
        if (!Object.keys(changed).length) return;

        setSaving(true);
        setError('');
        try {
            await saveCredentialFields(adminLoginid, active, changed);
            setSaved(true);
            setTimeout(() => setSaved(false), 1800);
            setDraft({});
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save.');
        } finally {
            setSaving(false);
        }
    };

    const add = async () => {
        const key = newKey.trim().toLowerCase();
        if (!adminLoginid || !SITE_KEY.test(key)) {
            setError('A site key is lowercase letters, numbers, dashes or underscores.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await addSite(adminLoginid, { site: key, label: newLabel.trim() });
            setNewKey('');
            setNewLabel('');
            setAdding(false);
            await load();
            setActive(key);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not add the site.');
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        if (!adminLoginid || !row) return;
        setSaving(true);
        setError('');
        try {
            await deleteSite(adminLoginid, row.site);
            setActive('');
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not remove the site.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className='space-y-6'>
            <div className='flex flex-wrap items-end justify-between gap-3'>
                <div>
                    <h1 className='flex items-center gap-2 text-xl font-extrabold text-white'>
                        <Settings2 size={20} className='text-violet-400' /> Sites Config
                    </h1>
                    <p className='mt-0.5 text-xs text-slate-500'>
                        A site with no markup token reports nothing and is left out of the totals.
                    </p>
                </div>
                <button type='button' onClick={() => setAdding(a => !a)} className='btn-primary px-4 py-2 text-sm'>
                    <Plus size={15} /> Add site
                </button>
            </div>

            {error && (
                <div className='flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-300'>
                    <AlertCircle size={18} className='mt-0.5 shrink-0' />
                    <p className='text-sm'>{error}</p>
                </div>
            )}

            {adding && (
                <div className='card max-w-lg space-y-3'>
                    <label className='block'>
                        <span className='text-xs font-semibold text-slate-300'>Site key</span>
                        <input
                            type='text'
                            autoFocus
                            value={newKey}
                            onChange={e => setNewKey(e.target.value)}
                            placeholder='livederiv'
                            className='mt-1 w-full rounded-lg border border-line bg-ink-800 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none'
                        />
                        <span className='mt-1 block text-[11px] text-slate-500'>
                            Lowercase, no spaces. It cannot be changed afterwards.
                        </span>
                    </label>
                    <label className='block'>
                        <span className='text-xs font-semibold text-slate-300'>Display name (optional)</span>
                        <input
                            type='text'
                            value={newLabel}
                            onChange={e => setNewLabel(e.target.value)}
                            placeholder='Live Deriv'
                            className='mt-1 w-full rounded-lg border border-line bg-ink-800 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none'
                        />
                    </label>
                    <button
                        type='button'
                        onClick={() => void add()}
                        disabled={saving || !newKey.trim()}
                        className='btn-primary w-full py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50'
                    >
                        {saving && <Loader2 size={15} className='animate-spin' />}
                        Add site
                    </button>
                </div>
            )}

            {loading ? (
                <div className='flex justify-center py-16 text-slate-600'>
                    <Loader2 size={26} className='animate-spin' />
                </div>
            ) : sites.length === 0 ? (
                <div className='card text-center'>
                    <p className='text-sm text-slate-400'>No sites configured yet.</p>
                    <p className='mt-1 text-xs text-slate-600'>Add one to start reporting its markup.</p>
                </div>
            ) : (
                <>
                    {/* One site at a time — the fields are edited one site at a
                        time, and six sets of them at once reads as noise. */}
                    <div className='flex flex-wrap gap-2'>
                        {sites.map(s => {
                            const hasToken = valueOf(s, 'markupApiToken')?.set;
                            return (
                                <button
                                    key={s.site}
                                    type='button'
                                    onClick={() => setActive(s.site)}
                                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                                        active === s.site
                                            ? 'bg-cyan-600 text-white'
                                            : 'border border-line bg-ink-800 text-slate-300 hover:text-white'
                                    }`}
                                >
                                    {nameOf(s)}
                                    {!hasToken && <span className='ml-1.5 text-[10px] text-amber-300'>no token</span>}
                                </button>
                            );
                        })}
                    </div>

                    {row && (
                        <div className='card max-w-lg space-y-4'>
                            {fields.map(field => {
                                const current = valueOf(row, field.key);
                                const hint = current?.set ? String(current.value ?? '') : null;
                                return (
                                    <label key={field.key} className='block'>
                                        <span className='flex items-baseline justify-between gap-3'>
                                            <span className='text-xs font-semibold text-slate-300'>{field.label}</span>
                                            {field.secret && (
                                                <span className='text-[11px] text-slate-500'>
                                                    {hint ? `currently ${hint}` : 'not set'}
                                                </span>
                                            )}
                                        </span>
                                        <input
                                            type='text'
                                            autoComplete='off'
                                            placeholder={field.secret ? 'Leave blank to keep' : ''}
                                            value={draft[field.key] ?? (field.secret ? '' : String(current?.value ?? ''))}
                                            onChange={e => setDraft(d => ({ ...d, [field.key]: e.target.value }))}
                                            className='mt-1 w-full rounded-lg border border-line bg-ink-800 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none'
                                        />
                                    </label>
                                );
                            })}

                            <div className='flex items-center gap-2'>
                                <button
                                    type='button'
                                    onClick={() => void save()}
                                    disabled={saving || Object.keys(draft).length === 0}
                                    className='btn-primary flex-1 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50'
                                >
                                    {saving ? (
                                        <Loader2 size={15} className='animate-spin' />
                                    ) : saved ? (
                                        <Check size={15} />
                                    ) : null}
                                    {saved ? 'Saved' : `Save ${nameOf(row)}`}
                                </button>
                                <button
                                    type='button'
                                    onClick={() => void remove()}
                                    disabled={saving}
                                    title={`Remove ${nameOf(row)} from the sweep`}
                                    className='rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50'
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AdminSitesConfig;
