import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Globe, Loader2, RefreshCw } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import { fetchMarkupAll, type MarkupSite, type MarkupTotal } from '@/services/qv-admin';

/**
 * Every site's markup, and what they come to together.
 *
 * The Markup page below this one answers "how is this app doing", which is the
 * question you ask second. This one answers "how are we doing" — across the
 * five bots and this app, which earn through the same Deriv account and had
 * never been added up anywhere.
 *
 * The figures come from quantum-vault, which holds each site's markup token.
 * This app's own row arrives in the same sweep rather than being fetched here
 * and added on, so nothing can be counted twice.
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

const ZERO: MarkupTotal = {
    app_markup_usd: 0,
    volume_usd: 0,
    payout_usd: 0,
    contract_count: 0,
    client_count: 0,
};

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const fmtUSD = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const fmtNum = (n: number) => (Number(n) || 0).toLocaleString('en-US');

const RANGES: Record<string, { label: string; get: () => { from: string; to: string } }> = {
    mtd: {
        label: 'This month',
        get: () => {
            const n = new Date();
            return { from: isoDay(new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1))), to: isoDay(n) };
        },
    },
    last30: {
        label: 'Last 30 days',
        get: () => {
            const n = new Date();
            const f = new Date(n);
            f.setUTCDate(f.getUTCDate() - 29);
            return { from: isoDay(f), to: isoDay(n) };
        },
    },
    lastMonth: {
        label: 'Last month',
        get: () => {
            const n = new Date();
            return {
                from: isoDay(new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - 1, 1))),
                to: isoDay(new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 0))),
            };
        },
    },
};

const Card = ({ label, value, accent }: { label: string; value: string; accent?: string }) => (
    <div className='card'>
        <p className='text-[11px] uppercase tracking-wider text-slate-500'>{label}</p>
        <p className={`mt-1 text-2xl font-extrabold ${accent ?? 'text-white'}`}>{value}</p>
    </div>
);

/* A site the vault could not read says so by name. A total that is short for
   a reason you cannot see is worse than one that is visibly incomplete. */
const noteFor = (error: string) =>
    error === 'not_configured' ? 'No markup token set — add it on Sites Config' : `Could not be read (${error})`;

const AdminMarkupOverview = () => {
    const { adminLoginid } = useAdmin();
    const [rangeKey, setRangeKey] = useState('mtd');
    const [range, setRange] = useState(RANGES.mtd.get());
    const [sites, setSites] = useState<MarkupSite[]>([]);
    const [total, setTotal] = useState<MarkupTotal>(ZERO);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => setRange(RANGES[rangeKey].get()), [rangeKey]);

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

    const unreadable = sites.filter(s => s.error);

    return (
        <div className='space-y-6'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                    <h1 className='flex items-center gap-2 text-xl font-extrabold text-white'>
                        <Globe size={20} className='text-cyan-400' /> Markup Overview
                    </h1>
                    <p className='mt-0.5 text-xs text-slate-500'>
                        Every site, {range.from} to {range.to}
                    </p>
                </div>
                <div className='flex items-center gap-2'>
                    {Object.entries(RANGES).map(([key, r]) => (
                        <button
                            key={key}
                            type='button'
                            onClick={() => setRangeKey(key)}
                            className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                                rangeKey === key
                                    ? 'bg-cyan-600 text-white'
                                    : 'border border-line bg-ink-800 text-slate-300 hover:text-white'
                            }`}
                        >
                            {r.label}
                        </button>
                    ))}
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
                    <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                        <Card label='Total markup' value={fmtUSD(total.app_markup_usd)} accent='text-cyan-300' />
                        <Card label='Volume' value={fmtUSD(total.volume_usd)} />
                        <Card label='Payout' value={fmtUSD(total.payout_usd)} />
                        <Card label='Contracts' value={fmtNum(total.contract_count)} />
                    </div>

                    {unreadable.length > 0 && (
                        <div className='rounded-xl border border-amber-500/40 bg-amber-500/10 p-4'>
                            <p className='text-sm font-semibold text-amber-300'>
                                {unreadable.length} of {sites.length} sites are missing from this total
                            </p>
                            <ul className='mt-2 space-y-1'>
                                {unreadable.map(s => (
                                    <li key={s.site} className='text-xs text-amber-200/80'>
                                        <span className='font-semibold'>{labelFor(s.site)}</span> —{' '}
                                        {noteFor(s.error ?? 'unknown')}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className='card overflow-hidden p-0'>
                        <div className='border-b border-line px-4 py-3'>
                            <h2 className='text-sm font-bold text-white'>By site</h2>
                        </div>
                        <div className='overflow-x-auto'>
                            <table className='w-full text-sm'>
                                <thead className='bg-ink-800/60 text-[11px] uppercase tracking-wider text-slate-500'>
                                    <tr>
                                        <th className='px-4 py-2.5 text-left font-semibold'>Site</th>
                                        <th className='px-4 py-2.5 text-right font-semibold'>Markup</th>
                                        <th className='px-4 py-2.5 text-right font-semibold'>Volume</th>
                                        <th className='px-4 py-2.5 text-right font-semibold'>Payout</th>
                                        <th className='px-4 py-2.5 text-right font-semibold'>Contracts</th>
                                        <th className='px-4 py-2.5 text-right font-semibold'>Clients</th>
                                    </tr>
                                </thead>
                                <tbody className='divide-y divide-line'>
                                    {sites.map(s => (
                                        <tr key={s.site} className={s.error ? 'text-slate-600' : 'text-slate-200'}>
                                            <td className='px-4 py-3 font-semibold'>
                                                {labelFor(s.site)}
                                                {s.error && (
                                                    <span className='ml-2 text-[11px]'>
                                                        ({noteFor(s.error)})
                                                    </span>
                                                )}
                                            </td>
                                            <td className='px-4 py-3 text-right font-bold tabular-nums text-white'>
                                                {fmtUSD(s.app_markup_usd)}
                                            </td>
                                            <td className='px-4 py-3 text-right tabular-nums'>{fmtUSD(s.volume_usd)}</td>
                                            <td className='px-4 py-3 text-right tabular-nums'>{fmtUSD(s.payout_usd)}</td>
                                            <td className='px-4 py-3 text-right tabular-nums'>
                                                {fmtNum(s.contract_count)}
                                            </td>
                                            <td className='px-4 py-3 text-right tabular-nums'>
                                                {fmtNum(s.client_count)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminMarkupOverview;
