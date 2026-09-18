import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, Smartphone, TriangleAlert, Wallet } from 'lucide-react';
import { getPayHeroWallet, topUpPayHero, type PayHeroWallet } from '@/services/admin-api';

/**
 * The PayHero float, and a way to refill it.
 *
 * Every M-Pesa push takes its fee from this wallet, and it is separate from the
 * one customer money lands in. When it empties, M-Pesa checkouts start failing
 * with "merchant has insufficient balance" while card and crypto carry on — so
 * nothing looks broken, sales just quietly stop coming through one channel.
 * That is the whole reason this screen exists: the failure is invisible unless
 * you go and look.
 */

/** Below this, M-Pesa is close enough to stopping to say so loudly. */
const LOW_KES = 500;
/** One tap rather than typing, for the amounts anyone actually tops up with. */
const PRESETS = [500, 1000, 2000, 5000];

const AdminPayHero = () => {
    const [wallet, setWallet] = useState<PayHeroWallet | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [amount, setAmount] = useState(1000);
    const [phone, setPhone] = useState('');
    const [sending, setSending] = useState(false);
    const [queued, setQueued] = useState<string | null>(null);
    const [topUpError, setTopUpError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(null);
        try {
            setWallet(await getPayHeroWallet());
        } catch (e: any) {
            setError(e?.message ?? 'Could not read the wallet balance');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    /* The number is only checked enough to decide whether the button is live —
       the server normalises it and has the final say. */
    const digits = phone.replace(/\D/g, '');
    const phoneValid =
        (digits.length === 10 && digits.startsWith('0')) ||
        (digits.length === 12 && digits.startsWith('254')) ||
        (digits.length === 9 && /^[17]/.test(digits));

    const submit = async () => {
        setSending(true);
        setTopUpError(null);
        setQueued(null);
        try {
            const res = await topUpPayHero({ amount, phone });
            setQueued(res.reference || 'queued');
            /* The balance does not move until the PIN is entered, so a refresh
               now would show the old figure and read as a failure. Left to the
               Refresh button, with the copy below saying why. */
        } catch (e: any) {
            setTopUpError(e?.message ?? 'Could not start the top-up');
        } finally {
            setSending(false);
        }
    };

    const low = wallet != null && wallet.balance < LOW_KES;

    return (
        <div className='flex w-full flex-col gap-4'>
            <h1 className='flex items-center gap-2 text-lg font-bold text-white'>
                <Wallet size={20} className='text-cyan-400' /> M-Pesa float
            </h1>
            <p className='text-sm text-slate-400'>
                PayHero charges a fee to your service wallet for every M-Pesa prompt it sends. If this empties, M-Pesa
                checkouts fail while card and crypto keep working.
            </p>

            {/* ── Balance ─────────────────────────────────────────────────── */}
            <div className={`card ${low ? 'border-rose-500/40' : ''}`}>
                <div className='flex flex-wrap items-start justify-between gap-4'>
                    <div>
                        <span className='label'>Available balance</span>
                        {loading ? (
                            <div className='mt-2 h-9 w-40 animate-pulse rounded bg-ink-700' aria-label='Loading' />
                        ) : error ? (
                            <p className='mt-2 flex items-center gap-1.5 text-sm text-rose-300'>
                                <TriangleAlert size={14} className='shrink-0' /> {error}
                            </p>
                        ) : (
                            <p
                                className={`mt-1 font-mono text-4xl font-extrabold ${
                                    low ? 'text-rose-400' : 'text-emerald-400'
                                }`}
                            >
                                {wallet?.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                                <span className='text-lg font-bold text-slate-400'>{wallet?.currency}</span>
                            </p>
                        )}
                    </div>

                    <button type='button' onClick={load} disabled={loading} className='btn-admin'>
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>

                {low && !error && (
                    <p className='mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-3 text-xs text-slate-300'>
                        <TriangleAlert size={15} className='mt-0.5 shrink-0 text-rose-400' />
                        <span>
                            <strong className='text-rose-300'>Running low.</strong> Top up before this reaches zero —
                            once it does, every M-Pesa payment is refused and customers see a failed checkout with
                            nothing to tell them why.
                        </span>
                    </p>
                )}
            </div>

            {/* ── Top up ──────────────────────────────────────────────────── */}
            <div className='card flex flex-col gap-4'>
                <div>
                    <h2 className='text-sm font-bold text-white'>Top up</h2>
                    <p className='mt-1 text-xs text-slate-400'>
                        An M-Pesa prompt goes to the number below. The balance moves once you enter your PIN.
                    </p>
                </div>

                <div className='flex flex-col gap-1.5'>
                    <span className='label'>Amount (KES)</span>
                    <div className='flex flex-wrap gap-2'>
                        {PRESETS.map(v => (
                            <button
                                key={v}
                                type='button'
                                onClick={() => setAmount(v)}
                                className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                                    amount === v
                                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                                        : 'border-line bg-ink-800 text-slate-400 hover:text-white'
                                }`}
                            >
                                {v.toLocaleString()}
                            </button>
                        ))}
                    </div>
                    <input
                        type='number'
                        min={1}
                        step={1}
                        value={amount}
                        onChange={e => setAmount(Math.max(1, Math.floor(Number(e.target.value)) || 0))}
                        className='mt-1 rounded-lg border border-line bg-ink-800 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-cyan-500'
                    />
                </div>

                <label className='flex flex-col gap-1.5'>
                    <span className='label'>Phone to charge</span>
                    <input
                        type='tel'
                        inputMode='tel'
                        autoComplete='tel'
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder='07XX XXX XXX'
                        className='rounded-lg border border-line bg-ink-800 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-cyan-500'
                    />
                </label>

                {topUpError && (
                    <p className='flex items-center gap-1.5 text-xs text-rose-300'>
                        <TriangleAlert size={13} className='shrink-0' /> {topUpError}
                    </p>
                )}

                {queued && (
                    <p className='flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-3 text-xs text-slate-300'>
                        <CheckCircle2 size={15} className='mt-0.5 shrink-0 text-emerald-400' />
                        <span>
                            <strong className='text-emerald-300'>Prompt sent.</strong> Enter your PIN on {phone}, then
                            hit Refresh above — the balance only moves once the payment completes.
                        </span>
                    </p>
                )}

                <button
                    type='button'
                    onClick={submit}
                    disabled={sending || !phoneValid || amount < 1}
                    className='btn-admin w-full disabled:cursor-not-allowed disabled:opacity-50'
                >
                    {sending ? <Loader2 size={16} className='animate-spin' /> : <Smartphone size={16} />}
                    Send M-Pesa prompt for {amount.toLocaleString()} KES
                </button>
            </div>
        </div>
    );
};

export default AdminPayHero;
