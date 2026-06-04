import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Save, Tag } from 'lucide-react';
import { getAdminPricing, setAdminPricing, type TierTable } from '@/services/admin-api';
import type { Tier } from '@/services/payments-api';

const ORDER: Tier[] = ['alpha', 'quantum', 'apex'];

const AdminPricing = () => {
    const [tiers, setTiers] = useState<TierTable | null>(null);
    const [defaults, setDefaults] = useState<TierTable | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const { tiers, defaults } = await getAdminPricing();
                setTiers(tiers);
                setDefaults(defaults);
            } catch (e: any) {
                setError(e?.message ?? 'Failed to load pricing');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const edit = (tier: Tier, field: 'priceUSD' | 'months', value: number) =>
        setTiers(t => (t ? { ...t, [tier]: { ...t[tier], [field]: value } } : t));

    const save = async () => {
        if (!tiers) return;
        setSaving(true);
        setError(null);
        setSaved(false);
        try {
            const body = ORDER.reduce(
                (acc, t) => ({ ...acc, [t]: { priceUSD: tiers[t].priceUSD, months: tiers[t].months } }),
                {} as Record<Tier, { priceUSD: number; months: number }>
            );
            const res = await setAdminPricing(body);
            setTiers(res.tiers);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e: any) {
            setError(e?.message ?? 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className='flex w-full flex-col gap-4'>
            <h1 className='flex items-center gap-2 text-lg font-bold text-white'>
                <Tag size={20} className='text-cyan-400' /> Pricing
            </h1>
            <p className='text-sm text-slate-400'>
                Edit tier prices and durations. Changes apply to new checkouts and the public pricing cards immediately.
            </p>

            {error && <div className='card border-rose-500/40 text-sm text-rose-300'>{error}</div>}

            {loading || !tiers ? (
                <div className='flex justify-center py-10'>
                    <Loader2 className='animate-spin text-cyan-400' />
                </div>
            ) : (
                <>
                    <div className='grid gap-3 sm:grid-cols-3'>
                        {ORDER.map(tier => (
                            <div key={tier} className='card flex flex-col gap-3'>
                                <div className='flex items-center justify-between'>
                                    <span className='text-sm font-bold uppercase tracking-wider text-amber-300'>
                                        {tiers[tier].label}
                                    </span>
                                    {defaults && (
                                        <span className='text-[10px] text-slate-500'>
                                            default ${defaults[tier].priceUSD} / {defaults[tier].months}mo
                                        </span>
                                    )}
                                </div>
                                <label className='flex flex-col gap-1'>
                                    <span className='text-[11px] text-slate-400'>Price (USD)</span>
                                    <input
                                        type='number'
                                        min={0}
                                        value={tiers[tier].priceUSD}
                                        onChange={e => edit(tier, 'priceUSD', Number(e.target.value))}
                                        className='rounded-lg border border-line bg-ink-800 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-cyan-500'
                                    />
                                </label>
                                <label className='flex flex-col gap-1'>
                                    <span className='text-[11px] text-slate-400'>Duration (months)</span>
                                    <input
                                        type='number'
                                        min={1}
                                        value={tiers[tier].months}
                                        onChange={e => edit(tier, 'months', Number(e.target.value))}
                                        className='rounded-lg border border-line bg-ink-800 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-cyan-500'
                                    />
                                </label>
                            </div>
                        ))}
                    </div>

                    <button onClick={save} disabled={saving} className='btn-admin w-full'>
                        {saving ? (
                            <Loader2 size={18} className='animate-spin' />
                        ) : saved ? (
                            <CheckCircle2 size={18} />
                        ) : (
                            <Save size={18} />
                        )}
                        {saved ? 'Saved' : 'Save pricing'}
                    </button>
                </>
            )}
        </div>
    );
};

export default AdminPricing;
