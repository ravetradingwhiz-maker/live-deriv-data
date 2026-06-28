import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { getMarkup, type MarkupTotals } from '@/services/admin-api';

/**
 * Deriv app-markup dashboard (v4 markup-statistics).
 *
 * Deriv's markup REST endpoint 403s browser/non-owner tokens, so this goes
 * through our own server proxy (`GET /api/admin/markup`), which calls Deriv with
 * the app-owner read token + Deriv-App-ID (set MARKUP_API_TOKEN / MARKUP_APP_ID
 * in server/.env) and filters to this single app id — same as quantum-vault.
 */
interface DayPoint {
    date: string;
    markup: number;
}

const ZERO: MarkupTotals = { markup: 0, volume: 0, payout: 0, contracts: 0, clients: 0 };
const fmtUSD = (n: number) => `$${(n || 0).toFixed(2)}`;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

const Sparkline = ({ data }: { data: DayPoint[] }) => {
    if (data.length < 2) return <p className='text-sm text-slate-500'>Not enough data yet.</p>;
    const w = 600;
    const h = 160;
    const max = Math.max(...data.map(d => d.markup), 0.0001);
    const pts = data.map((d, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - (d.markup / max) * (h - 10) - 5;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className='h-40 w-full' preserveAspectRatio='none'>
            <polyline
                points={pts.join(' ')}
                fill='none'
                stroke='#22d3ee'
                strokeWidth={2.5}
                strokeLinejoin='round'
                strokeLinecap='round'
            />
        </svg>
    );
};

const Card = ({ label, value, accent }: { label: string; value: string; accent?: string }) => (
    <div className='card'>
        <p className='text-[11px] uppercase tracking-wider text-slate-500'>{label}</p>
        <p className={`mt-1 text-2xl font-extrabold ${accent ?? 'text-white'}`}>{value}</p>
    </div>
);

const AdminMarkup = () => {
    const now = new Date();
    const [from, setFrom] = useState(isoDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))));
    const [to, setTo] = useState(isoDay(now));
    const [totals, setTotals] = useState<MarkupTotals>(ZERO);
    const [series, setSeries] = useState<DayPoint[]>([]);
    const [thisMonth, setThisMonth] = useState(0);
    const [lastMonth, setLastMonth] = useState(0);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');

    // Month comparison runs once on mount (independent of the range picker).
    useEffect(() => {
        (async () => {
            const y = now.getUTCFullYear();
            const m = now.getUTCMonth();
            const [tm, lm] = await Promise.all([
                getMarkup(isoDay(new Date(Date.UTC(y, m, 1))), isoDay(now)).catch(() => ZERO),
                getMarkup(isoDay(new Date(Date.UTC(y, m - 1, 1))), isoDay(new Date(Date.UTC(y, m, 0)))).catch(
                    () => ZERO
                ),
            ]);
            setThisMonth(tm.markup);
            setLastMonth(lm.markup);
        })();
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const load = async () => {
        if (!from || !to) return;
        setLoading(true);
        setErr('');
        try {
            setTotals(await getMarkup(from, to));

            // Keep the chart lightweight by requesting a small number of aggregated buckets.
            const start = new Date(`${from}T00:00:00Z`);
            const end = new Date(`${to}T00:00:00Z`);
            const span = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
            const bucketCount = Math.min(8, Math.max(4, Math.ceil(span / 7)));
            const bucketSize = Math.max(1, Math.ceil(span / bucketCount));

            const pts = await Promise.all(
                Array.from({ length: bucketCount }, async (_, i) => {
                    const bucketStart = new Date(start);
                    bucketStart.setUTCDate(start.getUTCDate() + i * bucketSize);
                    const bucketEnd = new Date(start);
                    bucketEnd.setUTCDate(start.getUTCDate() + Math.min(span - 1, (i + 1) * bucketSize - 1));

                    const totalsForBucket = await getMarkup(isoDay(bucketStart), isoDay(bucketEnd)).catch(() => ZERO);
                    return { date: isoDay(bucketStart), markup: totalsForBucket.markup };
                })
            );
            setSeries(pts);
        } catch (e: any) {
            setErr(e?.message ?? 'Failed to load markup.');
        } finally {
            setLoading(false);
        }
    };

    const daysInMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate();
    const predicted = (thisMonth / Math.max(1, now.getUTCDate())) * daysInMonth;
    const mom = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;

    return (
        <div className='flex w-full flex-col gap-4'>
            <h1 className='flex items-center gap-2 text-lg font-bold text-white'>
                <BarChart3 size={20} className='text-cyan-400' /> Markup
                {totals.app_id && <span className='text-xs font-normal text-slate-500'>App ID {totals.app_id}</span>}
            </h1>

            {/* Month comparison */}
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                <Card label='This month' value={fmtUSD(thisMonth)} accent='text-emerald-400' />
                <Card label='Last month' value={fmtUSD(lastMonth)} />
                <Card label='Predicted month' value={fmtUSD(predicted)} accent='text-cyan-400' />
                <Card
                    label='MoM change'
                    value={mom == null ? '—' : `${mom >= 0 ? '↑' : '↓'} ${Math.abs(mom).toFixed(1)}%`}
                    accent={mom == null ? 'text-slate-400' : mom >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                />
            </div>

            {/* Custom range */}
            <div className='flex flex-wrap items-end gap-2'>
                <label className='flex flex-col gap-1'>
                    <span className='text-[11px] text-slate-400'>From</span>
                    <input
                        type='date'
                        value={from}
                        onChange={e => setFrom(e.target.value)}
                        className='rounded-lg border border-line bg-ink-800 px-3 py-2 text-sm text-white outline-none'
                    />
                </label>
                <label className='flex flex-col gap-1'>
                    <span className='text-[11px] text-slate-400'>To</span>
                    <input
                        type='date'
                        value={to}
                        onChange={e => setTo(e.target.value)}
                        className='rounded-lg border border-line bg-ink-800 px-3 py-2 text-sm text-white outline-none'
                    />
                </label>
                <button onClick={load} disabled={loading} className='btn-admin'>
                    {loading ? 'Loading…' : 'Load'}
                </button>
            </div>

            {err && <div className='card border-rose-500/40 text-sm text-rose-300'>{err}</div>}

            <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                <Card label='Markup (range)' value={fmtUSD(totals.markup)} accent='text-emerald-400' />
                <Card label='Volume' value={fmtUSD(totals.volume)} />
                <Card label='Payout' value={fmtUSD(totals.payout)} />
                <Card label='Contracts' value={totals.contracts.toLocaleString()} />
                <Card label='Clients' value={totals.clients.toLocaleString()} />
            </div>

            <div className='card'>
                <p className='mb-3 flex items-center gap-2 text-sm font-semibold text-white'>
                    <TrendingUp size={16} className='text-cyan-400' /> Daily markup · {from} → {to}
                </p>
                <Sparkline data={series} />
            </div>
        </div>
    );
};

export default AdminMarkup;
