import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Save, TriangleAlert, Wallet } from 'lucide-react';
import {
    getAdminPaymentMethods,
    setAdminPaymentMethods,
    type MethodDefs,
    type MethodFlags,
    type MethodId,
} from '@/services/admin-api';

const ORDER: MethodId[] = ['card', 'mpesa', 'crypto'];

const AdminPaymentMethods = () => {
    const [methods, setMethods] = useState<MethodFlags | null>(null);
    const [defs, setDefs] = useState<MethodDefs | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const { methods, defs } = await getAdminPaymentMethods();
                setMethods(methods);
                setDefs(defs);
            } catch (e: any) {
                setError(e?.message ?? 'Failed to load payment methods');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const toggle = (id: MethodId) => setMethods(m => (m ? { ...m, [id]: !m[id] } : m));

    const noneEnabled = !!methods && !ORDER.some(id => methods[id]);

    const save = async () => {
        if (!methods || noneEnabled) return;
        setSaving(true);
        setError(null);
        setSaved(false);
        try {
            const res = await setAdminPaymentMethods(methods);
            setMethods(res.methods);
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
                <Wallet size={20} className='text-cyan-400' /> Payment methods
            </h1>
            <p className='text-sm text-slate-400'>
                Choose which options appear at checkout. Disabled methods are hidden from customers and rejected by the
                server, so an existing link can&apos;t be used to pay with them.
            </p>

            {error && <div className='card border-rose-500/40 text-sm text-rose-300'>{error}</div>}

            {loading || !methods || !defs ? (
                <div className='flex justify-center py-10'>
                    <Loader2 className='animate-spin text-cyan-400' />
                </div>
            ) : (
                <>
                    <div className='flex flex-col gap-3'>
                        {ORDER.map(id => {
                            const on = methods[id];
                            return (
                                <button
                                    key={id}
                                    type='button'
                                    onClick={() => toggle(id)}
                                    role='switch'
                                    aria-checked={on}
                                    className={`card flex items-center justify-between gap-4 text-left transition-colors ${
                                        on ? 'border-cyan-600' : 'border-line opacity-70'
                                    }`}
                                >
                                    <span className='flex flex-col'>
                                        <span className='text-sm font-bold text-white'>{defs[id].label}</span>
                                        <span className='text-xs text-slate-400'>{defs[id].desc}</span>
                                    </span>

                                    {/* Switch */}
                                    <span
                                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                                            on ? 'bg-cyan-500' : 'bg-ink-500'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-[#fff] transition-transform ${
                                                on ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {noneEnabled && (
                        <p className='flex items-center gap-1.5 text-xs text-amber-300'>
                            <TriangleAlert size={13} /> At least one method must stay enabled.
                        </p>
                    )}

                    <button onClick={save} disabled={saving || noneEnabled} className='btn-admin w-full'>
                        {saving ? (
                            <Loader2 size={18} className='animate-spin' />
                        ) : saved ? (
                            <CheckCircle2 size={18} />
                        ) : (
                            <Save size={18} />
                        )}
                        {saved ? 'Saved' : 'Save payment methods'}
                    </button>
                </>
            )}
        </div>
    );
};

export default AdminPaymentMethods;
