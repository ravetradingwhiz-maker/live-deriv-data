import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Loader2, Settings2 } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import {
    fetchCredentials,
    saveCredentialFields,
    type CredentialField,
    type CredentialSite,
    type CredentialValue,
} from '@/services/qv-admin';

/**
 * The Deriv credentials each site reports markup under.
 *
 * They decide whether Markup Overview can see a site at all: one without a
 * markup token and client id is reported as unconfigured and left out of the
 * total. Until now they could only be changed in the database.
 *
 * Secrets are never sent back in full — the vault returns the last four
 * characters. So a secret's box starts empty and its current value is shown
 * beside the label as a hint; typing replaces it and leaving it alone keeps
 * it. Identifiers arrive whole and are pre-filled, because a wrong app id is
 * impossible to spot behind asterisks. Only changed fields are sent.
 */

const SITE_LABELS: Record<string, string> = {
    quantumsyn: 'QuantumSyn',
    digitanalyzer: 'Digit Analyzer',
    '360tradingfx': '360TradingFX',
    binarytool: 'BinaryTool',
    dominator: 'Dominator',
    livederiv: 'Live Deriv',
};
const labelFor = (site: string) => SITE_LABELS[site] ?? site;

const valueOf = (row: CredentialSite | undefined, key: string): CredentialValue | null => {
    const v = row?.[key];
    return v && typeof v === 'object' ? (v as CredentialValue) : null;
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

    const load = useCallback(async () => {
        if (!adminLoginid) return;
        setLoading(true);
        setError('');
        try {
            const body = await fetchCredentials(adminLoginid);
            setFields(body.fields ?? []);
            setSites(body.sites ?? []);
            setActive(a => a || body.sites?.[0]?.site || '');
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
            if (value === '' && !fields.find(f => f.key === key)?.clear) continue;
            changed[key] = value;
        }
        if (!Object.keys(changed).length) return;

        setSaving(true);
        setError('');
        try {
            await saveCredentialFields(adminLoginid, active, changed);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            setDraft({});
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className='space-y-6'>
            <div>
                <h1 className='flex items-center gap-2 text-xl font-extrabold text-white'>
                    <Settings2 size={20} className='text-violet-400' /> Sites Config
                </h1>
                <p className='mt-0.5 text-xs text-slate-500'>
                    A site without a markup token and client id is left out of the totals.
                </p>
            </div>

            {error && (
                <div className='flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-300'>
                    <AlertCircle size={18} className='mt-0.5 shrink-0' />
                    <p className='text-sm'>{error}</p>
                </div>
            )}

            {loading ? (
                <div className='flex justify-center py-16 text-slate-600'>
                    <Loader2 size={26} className='animate-spin' />
                </div>
            ) : (
                <>
                    {/* One site at a time — six sites times six fields is too
                        much to read at once, and they are edited one at a time. */}
                    <div className='flex flex-wrap gap-2'>
                        {sites.map(s => (
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
                                {labelFor(s.site)}
                                {!s.exists && <span className='ml-1.5 text-[10px] text-amber-300'>not set up</span>}
                            </button>
                        ))}
                    </div>

                    <div className='card max-w-lg space-y-4'>
                        {!row?.exists && (
                            <p className='rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200'>
                                {labelFor(active)} has no credential row yet. One has to be created on the server
                                before its fields can be edited here.
                            </p>
                        )}

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
                                        disabled={!row?.exists}
                                        placeholder={field.secret ? 'Leave blank to keep' : ''}
                                        value={
                                            draft[field.key] ??
                                            (field.secret ? '' : String(current?.value ?? ''))
                                        }
                                        onChange={e =>
                                            setDraft(d => ({ ...d, [field.key]: e.target.value }))
                                        }
                                        className='mt-1 w-full rounded-lg border border-line bg-ink-800 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none disabled:opacity-50'
                                    />
                                </label>
                            );
                        })}

                        <button
                            type='button'
                            onClick={() => void save()}
                            disabled={saving || !row?.exists || Object.keys(draft).length === 0}
                            className='btn-primary w-full py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50'
                        >
                            {saving ? (
                                <Loader2 size={15} className='animate-spin' />
                            ) : saved ? (
                                <Check size={15} />
                            ) : null}
                            {saved ? 'Saved' : `Save ${labelFor(active)}`}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminSitesConfig;
