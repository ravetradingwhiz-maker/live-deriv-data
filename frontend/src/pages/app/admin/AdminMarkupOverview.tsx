import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Globe, Loader2, RefreshCw } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import { fetchMarkupAll, type MarkupSite, type MarkupTotal } from '@/services/qv-admin';

/**
 * Every site's markup, and what they come to together.
 *
 * The Markup page below this one answers "how is this app doing", which is the
 * question asked second. This one answers "how are we doing" — across every
 * site earning through the same Deriv account, which had never been added up
 * anywhere.
 *
 * Deriv reports in dollars; the money is spent in shillings. Both are shown,
 * with the rate that converted them, because a figure you have to convert in
 * your head is a figure you misread.
 */

const ZERO: MarkupTotal = {
    app_markup_usd: 0,
    volume_usd: 0,
    payout_usd: 0,
    contract_count: 0,
    client_count: 0,
};

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const fmtUSD = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const fmtKES = (n: number) => `KES ${(Number(n) || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
const fmtNum = (n: number) => (Number(n) || 0).toLocaleString('en-US');
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * How the round numbers are worked out, in UTC — which is the day Deriv bills
 * on, not the one the browser is in.
 */
const getPresetRange = (preset: string): { from: string; to: string } => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const d = now.getUTCDate();
    const day = (date: Date) => isoDay(date);
    switch (preset) {
        case 'today':
            return { from: day(new Date(Date.UTC(y, m, d))), to: day(new Date(Date.UTC(y, m, d))) };
        case 'yesterday': {
            const yest = new Date(Date.UTC(y, m, d - 1));
            return { from: day(yest), to: day(yest) };
        }
        case '7d':
            return { from: day(new Date(Date.UTC(y, m, d - 6))), to: day(new Date(Date.UTC(y, m, d))) };
        case '30d':
            return { from: day(new Date(Date.UTC(y, m, d - 29))), to: day(new Date(Date.UTC(y, m, d))) };
        case 'lastMonth':
            return { from: day(new Date(Date.UTC(y, m - 1, 1))), to: day(new Date(Date.UTC(y, m, 0))) };
        case 'thisMonth':
        default:
            return { from: day(new Date(Date.UTC(y, m, 1))), to: day(new Date(Date.UTC(y, m, d))) };
    }
};

const PRESETS: { id: string; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: '7d', label: 'Last 7 days' },
    { id: '30d', label: 'Last 30 days' },
    { id: 'thisMonth', label: 'This month' },
    { id: 'lastMonth', label: 'Last month' },
    { id: 'custom', label: 'Custom range' },
];

/** How the markup is divided. The page shows both halves, not just one. */
const SPLIT = [
    { pct: 60, label: '60%' },
    { pct: 40, label: '40%' },
];

/* The rate is read once a page load from a free public endpoint. If it cannot
   be reached the shilling figures are simply not drawn, rather than drawn at a
   rate that is a guess. */
const useUsdToKes = (): number | null => {
    const [rate, setRate] = useState<number | null>(null);
    useEffect(() => {
        let cancelled = false;
        fetch('https://open.er-api.com/v6/latest/USD')
            .then(r => r.json())
            .then(d => {
                if (!cancelled && d?.rates?.KES) setRate(Number(d.rates.KES));
            })
            .catch(() => {
                /* no rate, no shillings — the dollars still read correctly */
            });
        return () => {
            cancelled = true;
        };
    }, []);
    return rate;
};

/** A site's own name for itself, falling back to its key. */
const labelFor = (site: string) => {
    const known: Record<string, string> = {
        quantumsyn: 'QuantumSyn',
        digitanalyzer: 'Digit Analyzer',
        '360tradingfx': '360TradingFX',
        binarytool: 'BinaryTool',
        dominator: 'Dominator',
        livederiv: 'Live Deriv',
    };
    return known[site] ?? titleCase(site);
};

const AdminMarkupOverview = () => {
    const { adminLoginid } = useAdmin();
    const usdToKes = useUsdToKes();
    const [preset, setPreset] = useState('thisMonth');
    const [range, setRange] = useState(() => getPresetRange('thisMonth'));
    const [sites, setSites] = useState<MarkupSite[]>([]);
    const [total, setTotal] = useState<MarkupTotal>(ZERO);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    /* A preset sets both dates; editing either date makes the range custom,
       so the control never claims to be showing a month it is not. */
    const choosePreset = (id: string) => {
        setPreset(id);
        if (id !== 'custom') setRange(getPresetRange(id));
    };
    const setDay = (which: 'from' | 'to', value: string) => {
        setPreset('custom');
        setRange(r => ({ ...r, [which]: value }));
    };

    const load = useCallback(async () => {
        if (!adminLoginid) return;
        setLoading(true);
        setError('');
        try {
            const data = await fetchMarkupAll(adminLoginid, range.from, range.to);
            setSites(Array.isArray(data.sites) ? data.sites : []);
            setTotal(data.total ?? ZERO);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load markup.');
            setSites([]);
            setTotal(ZERO);
        } finally {
            setLoading(false);
        }
    }, [adminLoginid, range.from, range.to]);

    useEffect(() => {
        void load();
    }, [load]);

    /* A site that earned nothing is noise in a list you read to see where the
       money came from. It is counted and named below rather than silently
       dropped — a list that quietly omits rows is how you stop trusting it. */
    const earning = sites.filter(s => Number(s.app_markup_usd) > 0);
    const silent = sites.filter(s => Number(s.app_markup_usd) <= 0);

    return (
        <div className='space-y-6'>
            <div className='flex flex-wrap items-end justify-between gap-3'>
                <div>
                    <h1 className='flex items-center gap-2 app-title font-extrabold text-white'>
                        <Globe size={20} className='text-cyan-400' /> Markup Overview
                    </h1>
                    <p className='mt-0.5 text-xs text-slate-500'>
                        {range.from} to {range.to}
                        {usdToKes && <span className='ml-2'>· 1 USD = {usdToKes.toFixed(2)} KES</span>}
                    </p>
                </div>
                <div className='flex flex-wrap items-end gap-2'>
                    <label className='block'>
                        <span className='mb-1 block text-[11px] font-semibold text-slate-500'>Range</span>
                        <select
                            value={preset}
                            onChange={e => choosePreset(e.target.value)}
                            className='rounded-lg border border-line bg-ink-800 px-3 py-2 text-xs font-semibold text-white focus:border-cyan-500 focus:outline-none'
                        >
                            {PRESETS.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className='block'>
                        <span className='mb-1 block text-[11px] font-semibold text-slate-500'>From</span>
                        <input
                            type='date'
                            value={range.from}
                            max={range.to}
                            onChange={e => setDay('from', e.target.value)}
                            className='rounded-lg border border-line bg-ink-800 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none'
                        />
                    </label>
                    <label className='block'>
                        <span className='mb-1 block text-[11px] font-semibold text-slate-500'>To</span>
                        <input
                            type='date'
                            value={range.to}
                            min={range.from}
                            onChange={e => setDay('to', e.target.value)}
                            className='rounded-lg border border-line bg-ink-800 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none'
                        />
                    </label>
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

            {loading && !sites.length ? (
                <div className='flex justify-center py-16 text-slate-600'>
                    <Loader2 size={26} className='animate-spin' />
                </div>
            ) : (
                <>
                    {/* The total is the page. Everything else gives it scale,
                        so everything else is quieter. */}
                    <div className='card'>
                        <div className='flex flex-wrap items-start justify-between gap-x-10 gap-y-5'>
                            <div>
                                <p className='text-[10px] uppercase tracking-wider sm:text-[11px] text-slate-500'>Total markup</p>
                                <p className='mt-1 text-4xl font-extrabold text-cyan-300'>
                                    {fmtUSD(total.app_markup_usd)}
                                </p>
                                {usdToKes && (
                                    <p className='mt-0.5 text-xs font-bold sm:text-sm text-white sm:text-lg'>
                                        {fmtKES(total.app_markup_usd * usdToKes)}
                                    </p>
                                )}
                            </div>

                            {/* Both halves, beside the figure they come out of,
                                so the sum is checkable at a glance. */}
                            <div className='flex gap-8'>
                                {SPLIT.map(({ pct, label }) => (
                                    <div key={pct}>
                                        <p className='text-[10px] uppercase tracking-wider sm:text-[11px] text-slate-500'>
                                            {label}
                                        </p>
                                        <p className='mt-1 app-title font-extrabold text-white'>
                                            {fmtUSD((total.app_markup_usd * pct) / 100)}
                                        </p>
                                        {usdToKes && (
                                            <p className='mt-0.5 text-xs font-semibold sm:text-sm text-slate-400'>
                                                {fmtKES((total.app_markup_usd * usdToKes * pct) / 100)}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className='mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-line pt-3 text-xs'>
                            <span className='text-slate-500'>
                                Volume <span className='ml-1 font-bold text-slate-300'>{fmtUSD(total.volume_usd)}</span>
                            </span>
                            <span className='text-slate-500'>
                                Payout <span className='ml-1 font-bold text-slate-300'>{fmtUSD(total.payout_usd)}</span>
                            </span>
                            <span className='text-slate-500'>
                                Contracts{' '}
                                <span className='ml-1 font-bold text-slate-300'>{fmtNum(total.contract_count)}</span>
                            </span>
                            <span className='text-slate-500'>
                                Clients{' '}
                                <span className='ml-1 font-bold text-slate-300'>{fmtNum(total.client_count)}</span>
                            </span>
                        </div>
                    </div>

                    {earning.length === 0 ? (
                        <div className='card text-center'>
                            <p className='text-xs text-slate-400 sm:text-sm'>No site earned markup in this period.</p>
                        </div>
                    ) : (
                        <div className='card overflow-hidden p-0'>
                            <div className='overflow-x-auto'>
                                <table className='w-full text-xs sm:text-sm'>
                                    <thead className='bg-ink-800/60 text-[10px] uppercase tracking-wider sm:text-[11px] text-slate-500'>
                                        <tr>
                                            <th className='px-2.5 py-2 sm:px-4 sm:py-2.5 text-left font-semibold'>Site</th>
                                            <th className='px-2.5 py-2 sm:px-4 sm:py-2.5 text-right font-semibold'>Markup</th>
                                            {usdToKes && (
                                                <th className='px-2.5 py-2 sm:px-4 sm:py-2.5 text-right font-semibold'>In KES</th>
                                            )}
                                            <th className='px-2.5 py-2 sm:px-4 sm:py-2.5 text-right font-semibold'>Volume</th>
                                            <th className='px-2.5 py-2 sm:px-4 sm:py-2.5 text-right font-semibold'>Contracts</th>
                                            <th className='px-2.5 py-2 sm:px-4 sm:py-2.5 text-right font-semibold'>Clients</th>
                                        </tr>
                                    </thead>
                                    <tbody className='divide-y divide-line'>
                                        {earning.map(s => (
                                            <tr key={s.site} className='text-slate-200'>
                                                <td className='px-2.5 py-2 sm:px-4 sm:py-3 font-semibold text-white'>
                                                    {labelFor(s.site)}
                                                </td>
                                                <td className='px-2.5 py-2 sm:px-4 sm:py-3 text-right font-bold tabular-nums text-cyan-300'>
                                                    {fmtUSD(s.app_markup_usd)}
                                                </td>
                                                {usdToKes && (
                                                    <td className='px-2.5 py-2 sm:px-4 sm:py-3 text-right font-semibold tabular-nums'>
                                                        {fmtKES(s.app_markup_usd * usdToKes)}
                                                    </td>
                                                )}
                                                <td className='px-2.5 py-2 sm:px-4 sm:py-3 text-right tabular-nums'>
                                                    {fmtUSD(s.volume_usd)}
                                                </td>
                                                <td className='px-2.5 py-2 sm:px-4 sm:py-3 text-right tabular-nums'>
                                                    {fmtNum(s.contract_count)}
                                                </td>
                                                <td className='px-2.5 py-2 sm:px-4 sm:py-3 text-right tabular-nums'>
                                                    {fmtNum(s.client_count)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Named, not hidden: a site earning nothing because its
                        token is missing looks exactly like one that simply had
                        a quiet month, and only this line tells them apart. */}
                    {silent.length > 0 && (
                        <p className='text-xs text-slate-500'>
                            Not listed, nothing earned:{' '}
                            {silent
                                .map(s => `${labelFor(s.site)}${s.error === 'not_configured' ? ' (no token)' : ''}`)
                                .join(', ')}
                        </p>
                    )}
                </>
            )}
        </div>
    );
};

export default AdminMarkupOverview;
