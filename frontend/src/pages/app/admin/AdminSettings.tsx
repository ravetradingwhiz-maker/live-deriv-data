import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Check, Loader2, SlidersHorizontal } from 'lucide-react';
import { getAdminAppearance, setAdminAppearance, type Appearance } from '@/services/admin-api';

/**
 * How the site looks. Not what it charges, and not who may use it.
 *
 * A theme lives here rather than in the build so that turning one on is a
 * switch — and, more to the point, so turning it off is too. A seasonal
 * theme that needs a release to remove is still on the site in March.
 *
 * The change takes effect for a visitor on their next load: the flag is read
 * once per page rather than polled, because a theme changing underneath
 * someone mid-session is stranger than one that waits.
 */

interface ThemeRow {
    key: keyof Appearance;
    label: string;
    note: string;
}

const THEMES: ThemeRow[] = [
    {
        key: 'christmas',
        label: 'Christmas theme — site',
        note: 'The home page: header, hero, trees and snow.',
    },
    {
        key: 'christmasApp',
        label: 'Christmas theme — app',
        note: 'Behind the login: the dashboard, the bot screens and pricing.',
    },
];

/** A switch, not a checkbox: it takes effect on its own, with no Save. */
const Toggle = ({
    on,
    busy,
    onClick,
    label,
}: {
    on: boolean;
    busy: boolean;
    onClick: () => void;
    label: string;
}) => (
    <button
        type='button'
        role='switch'
        aria-checked={on}
        aria-label={label}
        disabled={busy}
        onClick={onClick}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            on ? 'bg-cyan-600' : 'bg-ink-700'
        }`}
    >
        <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                on ? 'translate-x-6' : 'translate-x-1'
            }`}
        />
    </button>
);

const AdminSettings = () => {
    const [flags, setFlags] = useState<Appearance | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setFlags(await getAdminAppearance());
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load settings.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const flip = async (key: keyof Appearance) => {
        if (!flags) return;
        setBusy(key);
        setError('');
        try {
            const next = await setAdminAppearance({ [key]: !flags[key] });
            setFlags(next);
            setSaved(key);
            setTimeout(() => setSaved(null), 1800);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save that.');
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className='space-y-6'>
            <div>
                <h1 className='flex items-center gap-2 app-title font-extrabold text-white'>
                    <SlidersHorizontal size={20} className='text-sky-400' /> Settings
                </h1>
                <p className='mt-0.5 text-xs text-slate-500'>
                    Site themes. A change shows on a visitor's next page load.
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
                <div className='card max-w-xl divide-y divide-line p-0'>
                    {THEMES.map(theme => (
                        <div key={theme.key} className='flex items-center justify-between gap-6 px-5 py-4'>
                            <div className='min-w-0'>
                                <p className='flex items-center gap-2 text-xs font-bold sm:text-sm text-white'>
                                    {theme.label}
                                    {saved === theme.key && <Check size={14} className='text-emerald-400' />}
                                </p>
                                <p className='mt-0.5 text-xs text-slate-500'>{theme.note}</p>
                            </div>
                            <Toggle
                                on={Boolean(flags?.[theme.key])}
                                busy={busy === theme.key}
                                onClick={() => void flip(theme.key)}
                                label={theme.label}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminSettings;
