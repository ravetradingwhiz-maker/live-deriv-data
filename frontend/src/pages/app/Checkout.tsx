import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Coins, Copy, Crown, Loader2, TriangleAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import {
    createPayment,
    getPaymentOrder,
    getPricing,
    type PayCurrency,
    type PaymentOrder,
    type Tier,
    type TierPricing,
} from '@/services/payments-api';

const TIERS: Record<Tier, { label: string; priceUSD: number; term: string }> = {
    alpha: { label: 'Alpha', priceUSD: 100, term: '1 month' },
    quantum: { label: 'Quantum', priceUSD: 270, term: '3 months' },
    apex: { label: 'Apex', priceUSD: 480, term: '6 months' },
};

const COINS: { id: PayCurrency; label: string; icon: typeof Coins }[] = [
    { id: 'usdt', label: 'USDT (TRC-20)', icon: Coins },
];

type Phase = 'form' | 'pending' | 'paid' | 'failed';

const Checkout = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { accounts } = useAuth();
    const subscription = useSubscription();

    const tierParam = (params.get('tier') as Tier) || 'quantum';
    const tier: Tier = TIERS[tierParam] ? tierParam : 'quantum';
    const plan = TIERS[tier];

    const [pricing, setPricing] = useState<Record<Tier, TierPricing> | null>(null);
    useEffect(() => {
        getPricing()
            .then(setPricing)
            .catch(() => {});
    }, []);
    const dyn = pricing?.[tier];
    const priceUSD = dyn?.priceUSD ?? plan.priceUSD;
    const term = dyn ? (dyn.months === 1 ? '1 month' : `${dyn.months} months`) : plan.term;

    const [email, setEmail] = useState('');
    const [coin, setCoin] = useState<PayCurrency>('usdt');
    const [phase, setPhase] = useState<Phase>('form');
    const [order, setOrder] = useState<PaymentOrder | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copiedAmount, setCopiedAmount] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loginids = accounts.map(a => a.loginid);
    const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

    const startPayment = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const created = await createPayment({ tier, payCurrency: coin, email, loginids });
            setOrder(created);
            setPhase('pending');
        } catch (e: any) {
            setError(e?.message ?? 'Could not start the payment.');
        } finally {
            setSubmitting(false);
        }
    };

    // Poll order status once we're awaiting payment.
    useEffect(() => {
        if (phase !== 'pending' || !order) return;
        const tick = async () => {
            try {
                const fresh = await getPaymentOrder(order.orderId);
                setOrder(fresh);
                if (fresh.status === 'paid') {
                    setPhase('paid');
                    subscription.refresh();
                } else if (fresh.status === 'expired' || fresh.status === 'failed') {
                    setPhase('failed');
                    setError(`Payment ${fresh.status}.`);
                }
            } catch {
                /* keep polling */
            }
        };
        pollRef.current = setInterval(tick, 6000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [phase, order, subscription]);

    const copyAddress = () => {
        if (!order?.payAddress) return;
        navigator.clipboard?.writeText(order.payAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const copyAmount = () => {
        if (order?.payAmount == null) return;
        navigator.clipboard?.writeText(String(order.payAmount));
        setCopiedAmount(true);
        setTimeout(() => setCopiedAmount(false), 1500);
    };

    return (
        <div className='mx-auto flex w-full max-w-lg flex-col gap-4'>
            <div className='flex items-center gap-2'>
                <Crown size={20} className='text-amber-400' />
                <h1 className='text-lg font-bold text-white'>
                    Checkout · <span className='text-amber-300'>{plan.label}</span>
                </h1>
            </div>

            {phase === 'paid' ? (
                <div className='card flex flex-col items-center gap-3 text-center'>
                    <CheckCircle2 size={42} className='text-emerald-400' />
                    <h2 className='text-lg font-bold text-white'>Payment confirmed</h2>
                    <p className='text-sm text-slate-400'>
                        Your <strong className='text-amber-300'>{plan.label}</strong> subscription is active and a
                        receipt has been sent to <strong>{email}</strong>.
                    </p>
                    <button
                        type='button'
                        onClick={() => navigate('/app/trade-pilot-premium')}
                        className='btn-nexora mt-2 w-full'
                    >
                        Open Nexora AI Premium
                    </button>
                </div>
            ) : phase === 'pending' && order ? (
                <div className='card flex flex-col gap-4'>
                    <div className='flex items-center justify-between gap-2 text-sm'>
                        <span className='text-slate-400'>Send exactly</span>
                        <button
                            type='button'
                            onClick={copyAmount}
                            title='Copy amount'
                            className='flex items-center gap-1.5 text-xl font-extrabold text-emerald-400 transition-colors hover:text-emerald-300'
                        >
                            {order.payAmount} USDT
                            <Copy size={15} />
                            {copiedAmount && <span className='text-[11px] font-semibold text-emerald-300'>Copied</span>}
                        </button>
                    </div>

                    <div className='flex justify-center'>
                        <img
                            alt='Payment address QR'
                            width={180}
                            height={180}
                            className='rounded-lg bg-[#ffffff] p-2'
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                                order.payAddress
                            )}`}
                        />
                    </div>

                    <div>
                        <span className='text-xs text-slate-400'>To this address</span>
                        <div className='mt-1 flex items-center gap-2 rounded-lg border border-line bg-ink-800 px-3 py-2'>
                            <span className='flex-1 break-all text-xs font-medium text-white'>{order.payAddress}</span>
                            <button
                                type='button'
                                onClick={copyAddress}
                                className='flex shrink-0 items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] text-slate-300 hover:border-cyan-700'
                            >
                                <Copy size={12} /> {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                    </div>

                    <div className='flex items-center justify-center gap-2 text-sm text-cyan-200'>
                        <Loader2 size={16} className='animate-spin' /> Waiting for payment confirmation…
                    </div>
                    <p className='text-center text-[11px] text-slate-500'>
                        Send the <strong>exact</strong> amount in <strong>USDT (TRC-20 / TRON)</strong> — the amount is
                        unique to this order so we can match it. This page updates automatically once the network
                        confirms (usually a couple of minutes).
                    </p>
                </div>
            ) : (
                <div className='card flex flex-col gap-4'>
                    <div className='flex items-center justify-between rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2'>
                        <span className='text-sm font-semibold text-amber-200'>
                            {plan.label} · {term}
                        </span>
                        <span className='font-bold text-white'>${priceUSD}</span>
                    </div>

                    <label className='flex flex-col gap-1'>
                        <span className='text-xs font-medium text-slate-400'>Email for your receipt</span>
                        <input
                            type='email'
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder='you@email.com'
                            className='rounded-lg border border-line bg-ink-800 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-amber-400'
                        />
                    </label>

                    <div>
                        <span className='text-xs font-medium text-slate-400'>Pay with</span>
                        <div className='mt-1 grid grid-cols-3 gap-2'>
                            {COINS.map(c => {
                                const Icon = c.icon;
                                const active = c.id === coin;
                                return (
                                    <button
                                        key={c.id}
                                        type='button'
                                        onClick={() => setCoin(c.id)}
                                        className={`flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-sm font-semibold transition-all ${
                                            active
                                                ? 'border-amber-400 bg-amber-400/10 text-amber-200'
                                                : 'border-line bg-ink-800 text-slate-300 hover:border-amber-700'
                                        }`}
                                    >
                                        <Icon size={15} /> {c.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {error && (
                        <p className='flex items-center gap-1 text-xs text-rose-300'>
                            <TriangleAlert size={12} /> {error}
                        </p>
                    )}

                    <button
                        type='button'
                        onClick={startPayment}
                        disabled={!emailValid || submitting || loginids.length === 0}
                        className='btn-nexora w-full disabled:cursor-not-allowed disabled:opacity-50'
                    >
                        {submitting ? <Loader2 size={18} className='animate-spin' /> : <Crown size={18} />}
                        Pay ${priceUSD} in USDT
                    </button>
                    <p className='text-center text-[11px] text-slate-500'>
                        Premium unlocks for all your logins (real + demo) once the payment confirms.
                    </p>
                </div>
            )}
        </div>
    );
};

export default Checkout;
