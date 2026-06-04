import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowUpDown,
    CheckCircle2,
    Crown,
    Equal,
    Hash,
    Lock,
    Play,
    Shuffle,
    Sparkles,
    Square,
    TrendingUp,
    TriangleAlert,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useAdminOptional } from '@/context/AdminContext';
import { getActiveCurrency } from '@/services/trade-api';
import type { Tier } from '@/services/payments-api';
import { useNexoraBot, type NexoraFamily, type NexoraStrategy, type RiskLevel } from '@/hooks/useNexoraBot';

const TIERS: { id: Tier; label: string; tagline: string; offers: string[] }[] = [
    { id: 'alpha', label: 'Alpha', tagline: 'Entry', offers: ['Real & Demo', 'Over/Under, Matches/Differs', 'Priority execution'] },
    { id: 'quantum', label: 'Quantum', tagline: 'Popular', offers: ['Everything in Alpha', 'Mix all strategies', 'All markets'] },
    { id: 'apex', label: 'Apex', tagline: 'Full power', offers: ['Everything in Quantum', 'Smart AI selection', '24/7 support'] },
];

const STRATEGIES: { id: NexoraStrategy; label: string; icon: typeof TrendingUp; accent?: boolean }[] = [
    { id: 'smart_ai', label: 'Smart AI', icon: Sparkles, accent: true },
    { id: 'rise_fall', label: 'Rise / Fall', icon: TrendingUp },
    { id: 'even_odd', label: 'Even / Odd', icon: Hash },
    { id: 'matches_differs', label: 'Matches / Differs', icon: Equal },
    { id: 'over_under', label: 'Over 4 / Under 5', icon: ArrowUpDown },
    { id: 'mix', label: 'Mix', icon: Shuffle },
];

const PREMIUM_FAMILIES: NexoraFamily[] = ['rise_fall', 'even_odd', 'over_under', 'matches_differs'];

const MARKETS: { symbol: string; name: string }[] = [
    { symbol: '1HZ100V', name: 'Volatility 100 (1s)' },
    { symbol: '1HZ75V', name: 'Volatility 75 (1s)' },
    { symbol: '1HZ50V', name: 'Volatility 50 (1s)' },
    { symbol: '1HZ25V', name: 'Volatility 25 (1s)' },
    { symbol: '1HZ10V', name: 'Volatility 10 (1s)' },
    { symbol: 'R_100', name: 'Volatility 100 Index' },
    { symbol: 'R_75', name: 'Volatility 75 Index' },
    { symbol: 'R_50', name: 'Volatility 50 Index' },
    { symbol: 'R_25', name: 'Volatility 25 Index' },
    { symbol: 'R_10', name: 'Volatility 10 Index' },
];

const NumberField = ({
    label,
    value,
    onChange,
    suffix,
    disabled,
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    suffix?: string;
    disabled?: boolean;
}) => (
    <label className='flex flex-col gap-1'>
        <span className='text-[11px] font-medium text-slate-400'>{label}</span>
        <div className='flex items-center rounded-lg border border-line bg-ink-800 px-3 focus-within:border-amber-400'>
            <input
                type='number'
                inputMode='decimal'
                min={0}
                step='any'
                disabled={disabled}
                value={Number.isFinite(value) ? value : ''}
                onChange={e => onChange(parseFloat(e.target.value))}
                className='w-full bg-transparent py-2 text-sm font-semibold text-white outline-none disabled:opacity-50'
            />
            {suffix && <span className='pl-2 text-xs font-medium text-slate-500'>{suffix}</span>}
        </div>
    </label>
);

const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

const TradePilotPremium = () => {
    const navigate = useNavigate();
    const { balanceCurrency } = useAuth();
    const subscription = useSubscription();
    const admin = useAdminOptional();
    const isAdmin = !!admin?.eligible; // admins get every tier free
    const currency = balanceCurrency || getActiveCurrency();

    const [tier, setTier] = useState<Tier>('alpha');
    const [strategy, setStrategy] = useState<NexoraStrategy>('smart_ai');
    const [symbol, setSymbol] = useState('1HZ100V');
    const [stake, setStake] = useState(1);
    const [profitTarget, setProfitTarget] = useState(20);
    const [maxLoss, setMaxLoss] = useState(20);

    const config = useMemo(
        () => ({
            strategy,
            risk: 'medium' as RiskLevel,
            symbol,
            stake,
            profitTarget,
            maxLoss,
            currency,
            families: PREMIUM_FAMILIES,
        }),
        [strategy, symbol, stake, profitTarget, maxLoss, currency]
    );

    const { ticksReady, isRunning, status, stats, start, stop } = useNexoraBot(config);

    const unlocked = isAdmin || subscription.covers(tier); // admins + active sub of >= tier
    const inputsValid = stake > 0 && profitTarget > 0 && maxLoss > 0;

    const showStatus = status.kind !== 'idle';
    const statusTone =
        status.kind === 'error'
            ? 'text-rose-300'
            : status.kind === 'target'
              ? 'text-emerald-300'
              : status.kind === 'trading'
                ? 'text-amber-200'
                : 'text-cyan-200';

    return (
        <div className='card flex w-full flex-col gap-3.5 border-amber-400/20'>
            {/* Header */}
            <div className='flex flex-wrap items-center gap-2.5'>
                <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-violet-500 shadow-[0_0_16px_rgba(245,158,11,0.5)]'>
                    <Crown size={18} className='text-ink-900' />
                </div>
                <div className='flex-1'>
                    <div className='flex flex-wrap items-center gap-1.5'>
                        <h1 className='bg-gradient-to-r from-amber-300 via-amber-200 to-violet-300 bg-clip-text text-base font-extrabold text-transparent'>
                            Nexora AI Premium
                        </h1>
                        <span className='rounded-full border border-amber-300/50 bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200'>
                            Premium
                        </span>
                        <span className='rounded-full border border-emerald-400/40 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300'>
                            Real &amp; Demo
                        </span>
                    </div>
                    {isAdmin ? (
                        <p className='flex items-center gap-1 text-[11px] text-emerald-300'>
                            <CheckCircle2 size={11} /> Admin access · all tiers unlocked
                        </p>
                    ) : subscription.active ? (
                        <p className='flex items-center gap-1 text-[11px] text-emerald-300'>
                            <CheckCircle2 size={11} /> {subscription.label} active · until {fmtDate(subscription.expiresAt)}
                        </p>
                    ) : (
                        <p className='text-[11px] text-amber-100/70'>Subscribe to activate the premium engine.</p>
                    )}
                </div>
                {!subscription.active && !isAdmin && (
                    <button
                        type='button'
                        onClick={() => navigate('/app/pricing')}
                        className='flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-violet-500 px-3.5 py-1.5 text-xs font-bold text-ink-900 shadow-[0_0_16px_rgba(245,158,11,0.45)] transition-all hover:brightness-110'
                    >
                        <Crown size={13} /> Unlock
                    </button>
                )}
            </div>

            {/* Subscription tiers */}
            <div>
                <h2 className='mb-1.5 text-[11px] font-medium text-slate-400'>Subscription tier</h2>
                <div className='grid gap-1.5 sm:grid-cols-3'>
                    {TIERS.map(t => {
                        const active = t.id === tier;
                        const owned = isAdmin || subscription.covers(t.id);
                        return (
                            <button
                                key={t.id}
                                type='button'
                                disabled={isRunning}
                                onClick={() => setTier(t.id)}
                                className={`flex flex-col gap-1.5 rounded-lg border p-2.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                                    active
                                        ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_14px_rgba(245,158,11,0.3)]'
                                        : 'border-line bg-ink-800 hover:border-amber-700'
                                }`}
                            >
                                <div className='flex items-baseline justify-between'>
                                    <span className={`text-sm font-bold ${active ? 'text-amber-200' : 'text-slate-200'}`}>
                                        {t.label}
                                    </span>
                                    {owned ? (
                                        <CheckCircle2 size={12} className='text-emerald-400' />
                                    ) : (
                                        <Lock size={11} className='text-slate-500' />
                                    )}
                                </div>
                                <ul className='flex flex-col gap-0.5'>
                                    {t.offers.map(o => (
                                        <li key={o} className='flex items-start gap-1 text-[10px] leading-tight text-slate-400'>
                                            <span className='mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-400' />
                                            {o}
                                        </li>
                                    ))}
                                </ul>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Strategy */}
            <div>
                <h2 className='mb-1.5 text-[11px] font-medium text-slate-400'>Strategy</h2>
                <div className='grid grid-cols-3 gap-1.5'>
                    {STRATEGIES.map(s => {
                        const Icon = s.icon;
                        const active = s.id === strategy;
                        return (
                            <button
                                key={s.id}
                                type='button'
                                disabled={isRunning}
                                onClick={() => setStrategy(s.id)}
                                className={`flex flex-col items-center gap-0.5 rounded-lg border px-1.5 py-2 text-center transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                                    active
                                        ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_14px_rgba(245,158,11,0.25)]'
                                        : 'border-line bg-ink-800 hover:border-amber-700'
                                }`}
                            >
                                <Icon
                                    size={15}
                                    className={active ? 'text-amber-300' : s.accent ? 'text-violet-300' : 'text-slate-400'}
                                />
                                <span className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-slate-300'}`}>
                                    {s.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Market + money */}
            <div className='grid gap-2.5 sm:grid-cols-2'>
                <label className='flex flex-col gap-1'>
                    <span className='text-[11px] font-medium text-slate-400'>Market</span>
                    <select
                        value={symbol}
                        disabled={isRunning}
                        onChange={e => setSymbol(e.target.value)}
                        className='rounded-lg border border-line bg-ink-800 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-amber-400 disabled:opacity-50'
                    >
                        {MARKETS.map(m => (
                            <option key={m.symbol} value={m.symbol} className='bg-ink-800'>
                                {m.name}
                            </option>
                        ))}
                    </select>
                </label>
                <NumberField label='Stake per trade' value={stake} onChange={setStake} suffix={currency} disabled={isRunning} />
            </div>
            <div className='grid gap-2.5 sm:grid-cols-2'>
                <NumberField label='Profit target' value={profitTarget} onChange={setProfitTarget} suffix={currency} disabled={isRunning} />
                <NumberField label='Max loss' value={maxLoss} onChange={setMaxLoss} suffix={currency} disabled={isRunning} />
            </div>

            {/* Total P/L */}
            {(stats.trades > 0 || isRunning) && (
                <div className='flex items-center justify-between rounded-lg border border-line bg-ink-800/60 px-3 py-2 text-xs'>
                    <span className='text-slate-400'>Total P/L</span>
                    <span className={`font-bold ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stats.netProfit >= 0 ? '+' : ''}
                        {stats.netProfit.toFixed(2)} {currency}
                    </span>
                </div>
            )}

            {showStatus && <p className={`text-center text-xs font-medium ${statusTone}`}>{status.text}</p>}

            {/* Run / unlock */}
            {!unlocked ? (
                <button
                    type='button'
                    onClick={() => navigate('/app/pricing')}
                    className='flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-violet-500 px-6 py-3 text-sm font-bold text-ink-900 shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all hover:brightness-110'
                >
                    <Lock size={16} /> Unlock {TIERS.find(t => t.id === tier)?.label} to run
                </button>
            ) : isRunning ? (
                <button
                    type='button'
                    onClick={stop}
                    className='flex w-full items-center justify-center gap-2 rounded-full bg-rose-600 px-6 py-3 font-bold text-white shadow-[0_0_20px_rgba(244,63,94,0.5)] transition-all hover:bg-rose-500'
                >
                    <Square size={16} /> Stop
                </button>
            ) : (
                <button
                    type='button'
                    onClick={start}
                    disabled={!inputsValid || !ticksReady}
                    className='flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-violet-500 px-6 py-3 text-sm font-bold text-ink-900 shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50'
                >
                    {!ticksReady ? 'Loading market…' : (
                        <>
                            <Play size={16} /> Run Nexora AI
                        </>
                    )}
                </button>
            )}
            {unlocked && !inputsValid && (
                <p className='flex items-center justify-center gap-1 text-center text-[11px] text-amber-300'>
                    <TriangleAlert size={12} /> Enter a stake, profit target and max loss greater than 0.
                </p>
            )}
        </div>
    );
};

export default TradePilotPremium;
