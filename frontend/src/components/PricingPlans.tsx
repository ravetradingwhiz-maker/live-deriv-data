import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    Bell,
    Check,
    CheckCircle2,
    Crown,
    Flame,
    Gift,
    LifeBuoy,
    ShieldCheck,
    ShoppingCart,
    Sparkles,
    Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSubscriptionOptional } from '@/context/SubscriptionContext';
import { useAdminOptional } from '@/context/AdminContext';
import { getPricing, type Tier, type TierPricing } from '@/services/payments-api';

const periodLabel = (months: number) => (months === 1 ? '/ month' : `/ ${months} months`);
const TIER_RANK: Record<Tier, number> = { alpha: 1, quantum: 2, apex: 3 };

// Pre-filled enquiry link for the support card.
const TELEGRAM_URL =
    'https://t.me/live_deriv?text=Hello%2C%20I%27ve%20seen%20your%20trading%20videos%20and%20I%27m%20interested%20in%20buying%20your%20software%20and%20joining%20your%20mentorship.%20What%27s%20the%20price%20and%20how%20do%20I%20get%20started%3F';

/**
 * The pill beside the plan name. Solid for the two we push, outlined for the
 * rest, so the eye lands on them first without every card shouting.
 */
const TAGS = {
    free: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    quiet: 'border-line bg-ink-700 text-slate-300',
    popular: 'border-cyan-600 bg-cyan-600 text-[#fff]',
    value: 'border-violet-600 bg-violet-600 text-[#fff]',
} as const;

interface Plan {
    name: string;
    subtitle: string;
    icon: LucideIcon;
    badge: string;
    /** Short pill next to the name — the one-word reason to pick this plan. */
    tag: { label: string; tone: keyof typeof TAGS };
    price: string;
    unit?: string;
    period: string;
    /** Billing length, used for the per-month figure. Omitted on the free plan. */
    months?: number;
    /**
     * Fallback seat count, used only when the pricing request fails.
     *
     * The live figure comes from the server and is edited under Admin →
     * Pricing; this is what the card falls back to so it does not render an
     * empty strip when the network is down.
     */
    slotsLeft?: number;
    account: string;
    cta: string;
    /** Where the CTA navigates (when authenticated). Defaults to manual trading. */
    to?: string;
    /** Subscription tier this plan grants (premium plans only). */
    tier?: Tier;
    features: string[];
    /** The three reassurances under the button. */
    assurances: string[];
    highlighted?: boolean;
}

const PLANS: Plan[] = [
    {
        name: 'Nexora AI Free',
        subtitle: 'Get started at no cost',
        icon: Gift,
        badge: 'FREE FOREVER',
        tag: { label: 'No card needed', tone: 'free' },
        price: 'Free',
        period: '/ lifetime',
        account: 'Real account only',
        cta: 'Start free',
        to: '/app/trade-pilot-free',
        assurances: ['No card required', 'Instant access', 'Email support'],
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
        tag: { label: 'Starter', tone: 'quiet' },
        price: '100',
        unit: 'USD',
        period: '/ month',
        months: 1,
        slotsLeft: 12,
        account: 'Real & Demo',
        cta: 'Get Alpha',
        to: '/app/checkout?tier=alpha',
        tier: 'alpha',
        assurances: ['Secure payment', 'Instant access', '7-day support'],
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
        tag: { label: 'Most popular', tone: 'popular' },
        price: '270',
        unit: 'USD',
        period: '/ 3 months',
        months: 3,
        slotsLeft: 7,
        account: 'Real & Demo',
        cta: 'Get Quantum',
        to: '/app/checkout?tier=quantum',
        tier: 'quantum',
        highlighted: true,
        assurances: ['Secure payment', 'Instant access', '7-day support'],
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
        tag: { label: 'Best value', tone: 'value' },
        price: '480',
        unit: 'USD',
        period: '/ 6 months',
        months: 6,
        slotsLeft: 5,
        account: 'Real & Demo',
        cta: 'Get Apex',
        to: '/app/checkout?tier=apex',
        tier: 'apex',
        assurances: ['Secure payment', 'Instant access', '7-day support'],
        features: [
            'Everything in Quantum',
            'TickStrike Pro bot — high tick · 5 ticks',
            'Auto Switcher bot — Only Ups/Downs',
            'Unlimited trading sessions',
            '24/7 priority support + strategy calls',
        ],
    },
];

const Bar = ({ className = '' }: { className?: string }) => (
    <span className={`block rounded bg-ink-700 ${className}`} />
);

/** Skeleton card — mirrors the real plan card layout while prices load. */
const PlanCardSkeleton = ({ highlighted }: { highlighted?: boolean }) => (
    <div
        className={`flex animate-pulse flex-col rounded-2xl border bg-ink-800 p-6 ${
            highlighted ? 'border-cyan-500/40 ring-1 ring-cyan-500/20' : 'border-line'
        }`}
    >
        <div className='flex items-start justify-between'>
            <div className='flex items-center gap-3'>
                <span className='h-11 w-11 shrink-0 rounded-xl bg-ink-700' />
                <div className='flex flex-col gap-1.5'>
                    <Bar className='h-3 w-24' />
                    <Bar className='h-2.5 w-16' />
                </div>
            </div>
            <Bar className='h-5 w-16 rounded-full' />
        </div>

        <div className='mt-5 rounded-xl border border-line bg-ink-900 px-5 py-5'>
            <Bar className='mb-3 h-4 w-20' />
            <Bar className='h-10 w-32' />
        </div>

        <Bar className='mt-3 h-5 w-24 rounded-full' />
        {/* The slot strip and the closing notice, so the card does not jump in
            height the moment prices land. */}
        <Bar className='mt-3 h-14 w-full rounded-xl' />

        <div className='mt-5 grid flex-1 gap-x-4 gap-y-3 sm:grid-cols-2'>
            {Array.from({ length: 6 }).map((_, i) => (
                <Bar key={i} className='h-3 w-full' />
            ))}
        </div>

        <Bar className='mt-6 h-11 w-full rounded-full' />
        <Bar className='mx-auto mt-3 h-2.5 w-48' />
        <Bar className='mt-4 h-14 w-full rounded-xl' />
    </div>
);

/** The pricing plan cards grid. Reused by the public page and the in-app tab. */
const PricingPlans = () => {
    const { isAuthenticated, loginOAuth2 } = useAuth();
    const subscription = useSubscriptionOptional();
    const admin = useAdminOptional();
    const isAdmin = !!admin?.eligible;
    const navigate = useNavigate();
    const [prices, setPrices] = useState<Record<Tier, TierPricing> | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        getPricing()
            .then(setPrices)
            .catch(() => {})
            .finally(() => setLoaded(true));
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

    if (!loaded) {
        return (
            <div className='mx-auto grid max-w-5xl gap-6 lg:grid-cols-2'>
                {PLANS.map((plan, i) => (
                    <PlanCardSkeleton key={i} highlighted={plan.highlighted} />
                ))}
            </div>
        );
    }

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
                const ctaLabel = isUpgrade ? `Upgrade to ${plan.name}` : `${plan.cta} now`;
                /* Someone who already has the plan, or gets it free as an admin,
                   is not being sold to — the discount, the slot count and the
                   price-rise warning are all suppressed for them. */
                const showOffer = !!plan.tier && !isCurrent && !isIncluded && !adminFree;
                // Only worth stating when it differs from the headline figure.
                const months = dyn ? dyn.months : plan.months;
                const perMonth = months && months > 1 ? Math.round(Number(price) / months) : null;
                /* Set under Admin → Pricing. Zero means the admin has turned the
                   line off, so it is a real value rather than a missing one —
                   hence `??` and not `||`. */
                const slotsLeft = dyn?.slotsLeft ?? plan.slotsLeft;
                const showSlots = showOffer && slotsLeft != null && slotsLeft > 0;
                return (
                    <div
                        key={`${plan.name}-${i}`}
                        className={`flex flex-col rounded-2xl border bg-ink-800 p-6 ${
                            plan.highlighted
                                ? 'border-cyan-500 shadow-2xl shadow-cyan-900/30 ring-1 ring-cyan-500/30'
                                : 'border-line'
                        }`}
                    >
                        <div className='flex items-start justify-between gap-3'>
                            <div className='flex min-w-0 items-center gap-3'>
                                <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-700 text-cyan-400'>
                                    <Icon size={22} />
                                </span>
                                <div className='min-w-0'>
                                    <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                                        <p className='text-lg font-extrabold uppercase tracking-wide text-white'>
                                            {plan.name}
                                        </p>
                                        <span
                                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                                TAGS[plan.tag.tone]
                                            }`}
                                        >
                                            {plan.tag.label}
                                        </span>
                                    </div>
                                    <p className='text-sm text-slate-400'>{plan.subtitle}</p>
                                </div>
                            </div>

                            {/* The discount is the loudest thing on a paid card, so it
                                gets the only solid-red element. Someone who already owns
                                the plan is not being sold to, so it goes away for them. */}
                            {showOffer ? (
                                <span className='flex shrink-0 items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-[#fff]'>
                                    <Flame size={16} className='shrink-0' />
                                    <span className='leading-tight'>
                                        <span className='block text-sm font-extrabold'>40% OFF</span>
                                        <span className='block text-[9px] font-bold uppercase tracking-wider opacity-90'>
                                            Limited time
                                        </span>
                                    </span>
                                </span>
                            ) : (
                                <span className='shrink-0 rounded-full border border-cyan-700 bg-ink-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300'>
                                    {plan.badge}
                                </span>
                            )}
                        </div>

                        <div className='mt-5 rounded-xl border border-line bg-ink-900 px-5 py-5'>
                            {original != null && (
                                <div className='mb-1 flex flex-wrap items-center gap-2'>
                                    {/* Grey, not red: the red belongs to the saving, and
                                        two reds beside each other read as one noisy block. */}
                                    <span className='font-mono text-lg text-slate-500 line-through'>
                                        {original} {plan.unit}
                                    </span>
                                    <span className='rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-400'>
                                        Save {original - Number(price)} {plan.unit}
                                    </span>
                                </div>
                            )}
                            <div className='flex flex-wrap items-baseline gap-x-2'>
                                <span className='font-mono text-5xl font-extrabold text-cyan-400'>{price}</span>
                                {plan.unit && (
                                    <span className='text-lg font-semibold text-slate-300'>{plan.unit}</span>
                                )}
                                <span className='text-sm text-slate-500'>{period}</span>
                            </div>
                            {/* The one persuasive number on the card that is simply
                                arithmetic on the price above it. */}
                            {perMonth != null && (
                                <p className='mt-2 text-xs font-semibold text-emerald-300'>
                                    Works out at {perMonth} {plan.unit} a month
                                </p>
                            )}
                        </div>

                        <div className='mt-3 flex flex-wrap items-center gap-3'>
                            <span
                                className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                    plan.account === 'Real & Demo'
                                        ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                                        : 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                                }`}
                            >
                                {plan.account}
                            </span>
                        </div>

                        {showSlots && (
                            <div className='mt-3 flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3'>
                                <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-400'>
                                    <ShoppingCart size={16} />
                                </span>
                                <p className='min-w-0 text-sm font-bold text-rose-400'>
                                    {slotsLeft === 1 ? 'Only 1 slot left' : `Only ${slotsLeft} slots left`}
                                    <span className='block text-xs font-medium text-slate-400'>at this price</span>
                                </p>
                            </div>
                        )}

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

                        {/* The small print people look for right after deciding. */}
                        <div className='mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-slate-500'>
                            {plan.assurances.map((a, n) => (
                                <span key={a} className='inline-flex items-center gap-1'>
                                    {n === 0 ? (
                                        <ShieldCheck size={12} className='shrink-0' />
                                    ) : (
                                        <span aria-hidden='true' className='mr-1'>
                                            ·
                                        </span>
                                    )}
                                    {a}
                                </span>
                            ))}
                        </div>

                        {showSlots && original != null ? (
                            <div className='mt-4 flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3'>
                                <Bell size={16} className='mt-0.5 shrink-0 text-rose-400' />
                                <p className='min-w-0 text-xs text-slate-400'>
                                    <span className='block text-sm font-bold text-rose-400'>
                                        This offer will not last long
                                    </span>
                                    Once the slots are gone, the price returns to {original} {plan.unit}.
                                </p>
                            </div>
                        ) : (
                            !plan.tier && (
                                <div className='mt-4 flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3'>
                                    <Gift size={16} className='mt-0.5 shrink-0 text-emerald-300' />
                                    <p className='min-w-0 text-xs text-slate-400'>
                                        <span className='block text-sm font-bold text-emerald-300'>
                                            Free, with no trial period
                                        </span>
                                        Run it as long as you like. Move up only when you want the extra bots.
                                    </p>
                                </div>
                            )
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
                            — we usually reply within a few hours.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PricingPlans;
