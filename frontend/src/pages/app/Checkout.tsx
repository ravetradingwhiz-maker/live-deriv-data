import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Check,
    CheckCircle2,
    Coins,
    Copy,
    CreditCard,
    Crown,
    Loader2,
    Lock,
    ShieldCheck,
    TriangleAlert,
    X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import {
    createPayment,
    getPaymentOrder,
    getPricing,
    initCardPayment,
    type PayCurrency,
    type PaymentOrder,
    type Tier,
    type TierPricing,
} from '@/services/payments-api';

type Method = 'card' | 'crypto';

const TIERS: Record<Tier, { label: string; priceUSD: number; term: string }> = {
    alpha: { label: 'Alpha', priceUSD: 100, term: '1 month' },
    quantum: { label: 'Quantum', priceUSD: 270, term: '3 months' },
    apex: { label: 'Apex', priceUSD: 480, term: '6 months' },
};

const METHODS: { id: Method; title: string; sub: string }[] = [
    { id: 'card', title: 'Card', sub: 'Credit / Debit card' },
    { id: 'crypto', title: 'Crypto', sub: 'USDT (TRC-20)' },
];

// Brand logos served from jsDelivr (a CDN built for hotlinking).
const CDN = 'https://cdn.jsdelivr.net/gh';
const CARD_LOGOS = [
    { src: `${CDN}/aaronfagan/svg-credit-card-payment-icons@main/flat/mastercard.svg`, alt: 'Mastercard' },
    { src: `${CDN}/aaronfagan/svg-credit-card-payment-icons@main/flat/visa.svg`, alt: 'Visa' },
];
const CRYPTO_LOGOS = [
    { src: `${CDN}/spothq/cryptocurrency-icons@master/128/color/usdt.png`, alt: 'USDT' },
    { src: `${CDN}/spothq/cryptocurrency-icons@master/128/color/btc.png`, alt: 'Bitcoin' },
    { src: `${CDN}/spothq/cryptocurrency-icons@master/128/color/eth.png`, alt: 'Ethereum' },
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
    const [method, setMethod] = useState<Method>('card');
    const coin: PayCurrency = 'usdt';
    const [agreed, setAgreed] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
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

    // Card: hand off to Paystack's hosted page. We don't clear `submitting` —
    // the browser navigates away, then returns to this page with ?reference=.
    const startCardPayment = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const { authorizationUrl } = await initCardPayment({ tier, email, loginids });
            window.location.href = authorizationUrl;
        } catch (e: any) {
            setError(e?.message ?? 'Could not start the card payment.');
            setSubmitting(false);
        }
    };

    // On return from Paystack the URL carries the order reference. Load it and
    // drop into the polling `pending` phase so the server verifies the charge.
    useEffect(() => {
        const ref = params.get('reference') || params.get('trxref');
        if (!ref) return;
        setPhase('pending');
        getPaymentOrder(ref)
            .then(setOrder)
            .catch(() => setError('Could not load your payment.'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                order.provider === 'paystack' ? (
                    <div className='card flex flex-col items-center gap-3 text-center'>
                        <Loader2 size={42} className='animate-spin text-cyan-400' />
                        <h2 className='text-lg font-bold text-white'>Confirming your payment…</h2>
                        <p className='text-sm text-slate-400'>
                            We&apos;re verifying your card payment with Paystack. This usually takes a few seconds and
                            updates here automatically.
                        </p>
                    </div>
                ) : (
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
                )
            ) : (
                <div className='card flex flex-col gap-5'>
                    {/* Order summary */}
                    <div className='flex items-center justify-between rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3'>
                        <div className='flex flex-col'>
                            <span className='text-sm font-semibold text-amber-200'>{plan.label} plan</span>
                            <span className='text-xs text-slate-400'>{term} of Nexora AI Premium</span>
                        </div>
                        <span className='text-2xl font-extrabold text-white'>${priceUSD}</span>
                    </div>

                    {/* Payment method */}
                    <div>
                        <span className='text-sm font-semibold text-white'>Select a payment method</span>
                        <div className='mt-3 grid grid-cols-2 gap-3'>
                            {METHODS.map(m => {
                                const active = m.id === method;
                                return (
                                    <button
                                        key={m.id}
                                        type='button'
                                        onClick={() => setMethod(m.id)}
                                        className={`relative flex flex-col items-center gap-2.5 rounded-2xl border p-4 text-center transition-all ${
                                            active
                                                ? 'border-cyan-500 bg-cyan-500/5 ring-2 ring-cyan-500/30'
                                                : 'border-line bg-ink-800 hover:border-slate-600'
                                        }`}
                                    >
                                        {active && (
                                            <span className='absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500'>
                                                <Check size={13} strokeWidth={3} className='text-[#fff]' />
                                            </span>
                                        )}
                                        <span className='flex h-10 items-center justify-center gap-1.5'>
                                            {(m.id === 'card' ? CARD_LOGOS : CRYPTO_LOGOS).map(logo => (
                                                <img
                                                    key={logo.alt}
                                                    src={logo.src}
                                                    alt={logo.alt}
                                                    title={logo.alt}
                                                    loading='lazy'
                                                    className='h-8 w-auto'
                                                />
                                            ))}
                                        </span>
                                        <span className='flex flex-col'>
                                            <span className='text-sm font-bold text-white'>{m.title}</span>
                                            <span className='text-[11px] text-slate-400'>Pay via {m.sub}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Email */}
                    <label className='flex flex-col gap-1.5'>
                        <span className='text-sm font-medium text-slate-300'>Email for your receipt</span>
                        <input
                            type='email'
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder='you@email.com'
                            className='rounded-xl border border-line bg-ink-800 px-4 py-3 text-sm font-semibold text-white outline-none transition-colors focus:border-cyan-400'
                        />
                    </label>

                    {method === 'crypto' && (
                        <p className='flex items-center gap-1.5 rounded-lg border border-line bg-ink-800 px-3 py-2 text-xs text-slate-400'>
                            <Coins size={14} className='shrink-0 text-emerald-400' /> You&apos;ll pay in{' '}
                            <strong className='text-slate-200'>USDT (TRC-20)</strong> on the TRON network.
                        </p>
                    )}

                    {error && (
                        <p className='flex items-center gap-1 text-xs text-rose-300'>
                            <TriangleAlert size={12} /> {error}
                        </p>
                    )}

                    {/* Terms agreement */}
                    <label className='flex items-start gap-2.5 text-xs text-slate-400'>
                        <input
                            type='checkbox'
                            checked={agreed}
                            onChange={e => setAgreed(e.target.checked)}
                            className='mt-0.5 h-4 w-4 shrink-0 accent-cyan-500'
                        />
                        <span>
                            I agree to the{' '}
                            <button
                                type='button'
                                onClick={() => setShowTerms(true)}
                                className='font-semibold text-cyan-300 underline underline-offset-2 hover:text-cyan-200'
                            >
                                Terms &amp; Conditions
                            </button>
                            .
                        </span>
                    </label>

                    <button
                        type='button'
                        onClick={method === 'card' ? startCardPayment : startPayment}
                        disabled={!emailValid || submitting || loginids.length === 0 || !agreed}
                        className='btn-nexora w-full disabled:cursor-not-allowed disabled:opacity-50'
                    >
                        {submitting ? (
                            <Loader2 size={18} className='animate-spin' />
                        ) : method === 'card' ? (
                            <CreditCard size={18} />
                        ) : (
                            <Crown size={18} />
                        )}
                        {method === 'card' ? `Pay $${priceUSD} by card` : `Pay $${priceUSD} in USDT`}
                    </button>
                    <p className='flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500'>
                        <Lock size={11} /> Secure checkout · unlocks for all your logins once payment confirms.
                    </p>
                </div>
            )}

            {/* Terms & Conditions modal */}
            {showTerms && (
                <div
                    className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm'
                    onClick={() => setShowTerms(false)}
                >
                    <div
                        className='w-full max-w-md rounded-2xl border border-line bg-ink-800 p-6 shadow-2xl'
                        onClick={e => e.stopPropagation()}
                    >
                        <div className='flex items-center justify-between'>
                            <h3 className='flex items-center gap-2 text-base font-bold text-white'>
                                <ShieldCheck size={18} className='text-cyan-400' /> Terms &amp; Conditions
                            </h3>
                            <button
                                type='button'
                                onClick={() => setShowTerms(false)}
                                className='text-slate-400 transition-colors hover:text-white'
                                aria-label='Close'
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className='mt-4 space-y-3 text-sm text-slate-400'>
                            <p>
                                Nexora AI is an independent analytics and automation tool. It is not affiliated with,
                                or endorsed by, Deriv.
                            </p>
                            <p>
                                Subscriptions are prepaid for the selected term and are non-refundable once the plan is
                                activated.
                            </p>
                            <p>
                                Trading carries risk. You alone are responsible for your trading decisions and any
                                resulting losses — no profit is guaranteed.
                            </p>
                        </div>
                        <button
                            type='button'
                            onClick={() => {
                                setAgreed(true);
                                setShowTerms(false);
                            }}
                            className='btn-primary mt-5 w-full'
                        >
                            I understand &amp; agree
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Checkout;
