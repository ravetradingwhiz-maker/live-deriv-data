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

    /* A site that earned nothing is noise in a list you read to see where the
       money came from. It is counted and named below rather than silently
       dropped — a list that quietly omits rows is how you stop trusting it. */
    const earning = sites.filter(s => Number(s.app_markup_usd) > 0);
    const silent = sites.filter(s => Number(s.app_markup_usd) <= 0);

    return (
        <div className='space-y-6'>
            <div className='flex flex-wrap items-end justify-between gap-3'>
                <div>
                    <h1 className='flex items-center gap-2 text-xl font-extrabold text-white'>
                        <Globe size={20} className='text-cyan-400' /> Markup Overview
                    </h1>
                    <p className='mt-0.5 text-xs text-slate-500'>
                        {range.from} to {range.to}
                        {usdToKes && <span className='ml-2'>· 1 USD = {usdToKes.toFixed(2)} KES</span>}
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
                    {/* The total is the page. Everything else gives it scale,
                        so everything else is quieter. */}
                    <div className='card'>
                        <p className='text-[11px] uppercase tracking-wider text-slate-500'>Total markup</p>
                        <p className='mt-1 text-4xl font-extrabold text-cyan-300'>
                            {fmtUSD(total.app_markup_usd)}
                        </p>
                        {usdToKes && (
                            <p className='mt-0.5 text-lg font-bold text-white'>
                                {fmtKES(total.app_markup_usd * usdToKes)}
                            </p>
                        )}
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
                            <p className='text-sm text-slate-400'>No site earned markup in this period.</p>
                        </div>
                    ) : (
                        <div className='card overflow-hidden p-0'>
                            <div className='overflow-x-auto'>
                                <table className='w-full text-sm'>
                                    <thead className='bg-ink-800/60 text-[11px] uppercase tracking-wider text-slate-500'>
                                        <tr>
                                            <th className='px-4 py-2.5 text-left font-semibold'>Site</th>
                                            <th className='px-4 py-2.5 text-right font-semibold'>Markup</th>
                                            {usdToKes && (
                                                <th className='px-4 py-2.5 text-right font-semibold'>In KES</th>
                                            )}
                                            <th className='px-4 py-2.5 text-right font-semibold'>Volume</th>
                                            <th className='px-4 py-2.5 text-right font-semibold'>Contracts</th>
                                            <th className='px-4 py-2.5 text-right font-semibold'>Clients</th>
                                        </tr>
                                    </thead>
                                    <tbody className='divide-y divide-line'>
                                        {earning.map(s => (
                                            <tr key={s.site} className='text-slate-200'>
                                                <td className='px-4 py-3 font-semibold text-white'>
                                                    {labelFor(s.site)}
                                                </td>
                                                <td className='px-4 py-3 text-right font-bold tabular-nums text-cyan-300'>
                                                    {fmtUSD(s.app_markup_usd)}
                                                </td>
                                                {usdToKes && (
                                                    <td className='px-4 py-3 text-right font-semibold tabular-nums'>
                                                        {fmtKES(s.app_markup_usd * usdToKes)}
                                                    </td>
                                                )}
                                                <td className='px-4 py-3 text-right tabular-nums'>
                                                    {fmtUSD(s.volume_usd)}
                                                </td>
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
