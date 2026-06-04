import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, Crown, Gift, LifeBuoy, Sparkles, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSubscriptionOptional } from '@/context/SubscriptionContext';
import { useAdminOptional } from '@/context/AdminContext';
import { getPricing, type Tier, type TierPricing } from '@/services/payments-api';

const periodLabel = (months: number) => (months === 1 ? '/ month' : `/ ${months} months`);
const TIER_RANK: Record<Tier, number> = { alpha: 1, quantum: 2, apex: 3 };

// Pre-filled enquiry links for the support card.
const TELEGRAM_URL =
    'https://t.me/live_deriv?text=Hello%2C%20I%27ve%20seen%20your%20trading%20videos%20and%20I%27m%20interested%20in%20buying%20your%20software%20and%20joining%20your%20mentorship.%20What%27s%20the%20price%20and%20how%20do%20I%20get%20started%3F';
const WHATSAPP_URL =
    'https://api.whatsapp.com/send/?phone=61421883113&text=Hello%2C+I%27ve+seen+your+trading+videos+and+I%27m+interested+in+buying+your+software+and+joining+your+mentorship.+What%27s+the+price+and+how+do+I+get+started%3F&type=phone_number&app_absent=0';

interface Plan {
    name: string;
    subtitle: string;
    icon: LucideIcon;
    badge: string;
    price: string;
    unit?: string;
    period: string;
    account: string;
    cta: string;
    /** Where the CTA navigates (when authenticated). Defaults to manual trading. */
    to?: string;
    /** Subscription tier this plan grants (premium plans only). */
    tier?: Tier;
    features: string[];
    highlighted?: boolean;
}

const PLANS: Plan[] = [
    {
        name: 'Nexora AI Free',
        subtitle: 'Get started at no cost',
        icon: Gift,
        badge: 'FREE FOREVER',
        price: 'Free',
        period: '/ lifetime',
        account: 'Real account only',
        cta: 'Start free',
        to: '/app/trade-pilot-free',
        features: [
            'Even/Odd AI & Rise/Fall Expert bots',
            'Automated Markov engine',
            'Risk levels: Low / Medium / High',
            'Live P&L & trade history',
            'Real account only',
            'Email & Telegram support',
        ],
    },
    {
        name: 'Alpha',
        subtitle: 'Entry premium',
        icon: Sparkles,
        badge: 'ALPHA',
        price: '100',
        unit: 'USD',
        period: '/ month',
        account: 'Real & Demo',
        cta: 'Get Alpha',
        to: '/app/checkout?tier=alpha',
        tier: 'alpha',
        features: [
            'Everything in Free',
            'Matches Printer bot — Matches strategy',
            'Trade on Real & Demo accounts',
            'Priority bot execution',
            'Email & Telegram support',
        ],
    },
    {
        name: 'Quantum',
        subtitle: 'Most popular',
        icon: Zap,
        badge: 'QUANTUM',
        price: '270',
        unit: 'USD',
        period: '/ 3 months',
        account: 'Real & Demo',
        cta: 'Get Quantum',
        to: '/app/checkout?tier=quantum',
        tier: 'quantum',
        highlighted: true,
        features: [
            'Everything in Alpha',
            'Over 8 Killer bot — Over 8 · 5 ticks',
            'All volatility markets',
            'Advanced risk profiles & analytics',
            'Priority support · email & Telegram',
        ],
    },
    {
        name: 'Apex',
        subtitle: 'Full power, maximum edge',
        icon: Crown,
        badge: 'APEX',
        price: '480',
        unit: 'USD',
        period: '/ 6 months',
        account: 'Real & Demo',
        cta: 'Get Apex',
        to: '/app/checkout?tier=apex',
        tier: 'apex',
        features: [
            'Everything in Quantum',
            'TickStrike Pro bot — high tick · 5 ticks',
            'Auto Switcher bot — Only Ups/Downs',
            'Unlimited trading sessions',
            '24/7 priority support + strategy calls',
        ],
    },
];

/** The pricing plan cards grid. Reused by the public page and the in-app tab. */
const PricingPlans = () => {
    const { isAuthenticated, loginOAuth2 } = useAuth();
    const subscription = useSubscriptionOptional();
    const admin = useAdminOptional();
    const isAdmin = !!admin?.eligible;
    const navigate = useNavigate();
    const [prices, setPrices] = useState<Record<Tier, TierPricing> | null>(null);

    useEffect(() => {
        getPricing()
            .then(setPrices)
            .catch(() => {});
    }, []);

    const handleStart = (to = '/app/manual') => {
        if (isAuthenticated) {
            navigate(to);
            return;
        }
        // Land back on the intended page after Deriv login (Callback honors this).
        sessionStorage.setItem('post_login_redirect', to);
        loginOAuth2();
    };

    return (
        <div className='mx-auto grid max-w-5xl gap-6 lg:grid-cols-2'>
            {PLANS.map((plan, i) => {
                const Icon = plan.icon;
                // Reflect admin-edited prices for the paid tiers.
                const dyn = plan.tier ? prices?.[plan.tier] : undefined;
                const price = dyn ? String(dyn.priceUSD) : plan.price;
                const period = dyn ? periodLabel(dyn.months) : plan.period;
                // "40% off" presentation: show the pre-discount price struck out.
                // The real charge stays `price` (the server charges the tier price).
                const original = plan.tier ? Math.round(Number(price) / 0.6) : null;
                // Subscription-aware CTA state (paid tiers only).
                const planRank = plan.tier ? TIER_RANK[plan.tier] : 0;
                const curRank = subscription?.active ? subscription.rank ?? 0 : 0;
                const adminFree = isAdmin && !!plan.tier;
                const isCurrent = !!plan.tier && subscription?.active && subscription.tier === plan.tier;
                const isUpgrade = !!plan.tier && subscription?.active && planRank > curRank;
                const isIncluded = !!plan.tier && subscription?.active && planRank < curRank;
                const ctaLabel = isUpgrade ? `Upgrade to ${plan.name}` : plan.cta;
                return (
                    <div
                        key={`${plan.name}-${i}`}
                        className={`flex flex-col rounded-2xl border bg-ink-800 p-6 ${
                            plan.highlighted
                                ? 'border-cyan-500 shadow-2xl shadow-cyan-900/30 ring-1 ring-cyan-500/30'
                                : 'border-line'
                        }`}
                    >
                        <div className='flex items-start justify-between'>
                            <div className='flex items-center gap-3'>
                                <span className='flex h-11 w-11 items-center justify-center rounded-xl bg-ink-700 text-cyan-400'>
                                    <Icon size={22} />
                                </span>
                                <div>
                                    <p className='text-xs font-bold uppercase tracking-widest text-cyan-300'>
                                        {plan.name}
                                    </p>
                                    <p className='text-sm text-slate-400'>{plan.subtitle}</p>
                                </div>
                            </div>
                            <span className='rounded-full border border-cyan-700 bg-ink-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300'>
                                {plan.badge}
                            </span>
                        </div>

                        <div className='mt-5 rounded-xl border border-line bg-ink-900 px-5 py-5'>
                            {original != null && (
                                <div className='mb-1 flex items-center gap-2'>
                                    <span className='font-mono text-lg text-rose-400 line-through decoration-rose-500'>
                                        {original} {plan.unit}
                                    </span>
                                    <span className='rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300'>
                                        40% off
                                    </span>
                                </div>
                            )}
                            <span className='font-mono text-5xl font-extrabold text-cyan-400'>{price}</span>
                            {plan.unit && <span className='ml-1 text-lg font-semibold text-slate-300'>{plan.unit}</span>}
                            <span className='ml-2 text-sm text-slate-500'>{period}</span>
                        </div>

                        <span
                            className={`mt-3 inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                plan.account === 'Real & Demo'
                                    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                                    : 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                            }`}
                        >
                            {plan.account}
                        </span>

                        <div className='mt-5 grid flex-1 gap-x-4 gap-y-3 sm:grid-cols-2'>
                            {plan.features.map(f => (
                                <span key={f} className='flex items-start gap-2 text-sm text-slate-300'>
                                    <Check size={16} className='mt-0.5 shrink-0 text-cyan-400' />
                                    {f}
                                </span>
                            ))}
                        </div>

                        {adminFree ? (
                            <div className='mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 py-3 font-semibold text-emerald-300'>
                                <CheckCircle2 size={18} />
                                Admin access
                            </div>
                        ) : isCurrent ? (
                            <div className='mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 py-3 font-semibold text-emerald-300'>
                                <CheckCircle2 size={18} />
                                Current plan
                            </div>
                        ) : isIncluded ? (
                            <div className='mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-line bg-ink-900 py-3 font-semibold text-slate-400'>
                                <CheckCircle2 size={18} />
                                Included
                            </div>
                        ) : (
                            <button
                                className={`${plan.highlighted ? 'btn-glow' : 'btn-primary'} mt-6 w-full py-3`}
                                onClick={() => handleStart(plan.to)}
                            >
                                {ctaLabel}
                                <ArrowRight size={18} />
                            </button>
                        )}
                    </div>
                );
            })}

            {/* Support */}
            <div className='lg:col-span-2'>
                <div className='flex flex-col items-center gap-2 rounded-2xl border border-line bg-ink-800 p-6 text-center sm:flex-row sm:justify-center sm:gap-4 sm:text-left'>
                    <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-700 text-cyan-400'>
                        <LifeBuoy size={22} />
                    </span>
                    <div>
                        <p className='text-sm font-semibold text-white'>Need a hand getting set up?</p>
                        <p className='text-sm text-slate-400'>
                            Reach our team on{' '}
                            <a
                                href={TELEGRAM_URL}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='font-semibold text-cyan-300 hover:underline'
                            >
                                Telegram
                            </a>{' '}
                            or{' '}
                            <a
                                href={WHATSAPP_URL}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='font-semibold text-emerald-300 hover:underline'
                            >
                                WhatsApp
                            </a>{' '}
                            — we usually reply within a few hours.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PricingPlans;
