import { useEffect, useMemo, useState } from 'react';
import { Hash, Layers, Lock, Play, Shuffle, Square, TrendingUp, TriangleAlert } from 'lucide-react';
import NexoraStar from '@/components/NexoraStar';
import { useAuth } from '@/context/AuthContext';
import { getActiveCurrency } from '@/services/trade-api';
import { riskStakingLabel, useNexoraBot, type NexoraStrategy, type RiskLevel } from '@/hooks/useNexoraBot';

const STRATEGIES: { id: NexoraStrategy; label: string; icon: typeof TrendingUp }[] = [
    { id: 'rise_fall', label: 'Rise / Fall', icon: TrendingUp },
    { id: 'even_odd', label: 'Even / Odd', icon: Hash },
    { id: 'mix', label: 'Mix Both', icon: Shuffle },
];

const RISKS: { id: RiskLevel; label: string; tone: string }[] = [
    { id: 'low', label: 'Low', tone: 'text-emerald-400' },
    { id: 'medium', label: 'Medium', tone: 'text-amber-400' },
    { id: 'high', label: 'High', tone: 'text-rose-400' },
];

// Allow demo accounts to run the bot. false = locked to real accounts only.
const ALLOW_DEMO_TRADING = false;

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

const Segmented = <T extends string>({
    options,
    value,
    onChange,
    disabled,
}: {
    options: { id: T; label: string; icon?: typeof TrendingUp; desc?: string; tone?: string }[];
    value: T;
    onChange: (v: T) => void;
    disabled?: boolean;
}) => (
    <div className='grid grid-cols-3 gap-2'>
        {options.map(opt => {
            const Icon = opt.icon;
            const active = opt.id === value;
            return (
                <button
                    key={opt.id}
                    type='button'
                    disabled={disabled}
                    onClick={() => onChange(opt.id)}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                        active
                            ? 'border-cyan-400 bg-cyan-400/10 shadow-[0_0_16px_rgba(34,211,238,0.25)]'
                            : 'border-line bg-ink-800 hover:border-cyan-700'
                    }`}
                >
                    {Icon && <Icon size={18} className={active ? 'text-cyan-300' : opt.tone ?? 'text-slate-400'} />}
                    <span className={`text-sm font-semibold ${active ? 'text-white' : opt.tone ?? 'text-slate-300'}`}>
                        {opt.label}
                    </span>
                    {opt.desc && <span className='text-[10px] leading-tight text-slate-500'>{opt.desc}</span>}
                </button>
            );
        })}
    </div>
);

const NumberField = ({
    label,
    value,
    onChange,
    suffix,
    disabled,
    min = 0,
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    suffix?: string;
    disabled?: boolean;
    min?: number;
}) => (
    <label className='flex flex-col gap-1'>
        <span className='text-xs font-medium text-slate-400'>{label}</span>
        <div className='flex items-center rounded-lg border border-line bg-ink-800 px-3 focus-within:border-cyan-500'>
            <input
                type='number'
                inputMode='decimal'
                min={min}
                step='any'
                disabled={disabled}
                value={Number.isFinite(value) ? value : ''}
                onChange={e => onChange(parseFloat(e.target.value))}
                className='w-full bg-transparent py-2.5 text-sm font-semibold text-white outline-none disabled:opacity-50'
            />
            {suffix && <span className='pl-2 text-xs font-medium text-slate-500'>{suffix}</span>}
        </div>
    </label>
);

const TradePilotFree = () => {
    const { accounts, activeLoginId, balanceCurrency } = useAuth();
    const activeAccount = accounts.find(a => a.loginid === activeLoginId);
    const isDemo = activeAccount?.is_demo ?? true;
    const currency = balanceCurrency || getActiveCurrency();

    const [strategy, setStrategy] = useState<NexoraStrategy>('mix');
    const [risk, setRisk] = useState<RiskLevel>('low');
    const [symbol, setSymbol] = useState('1HZ100V');
    const [stake, setStake] = useState(1);
    const [profitTarget, setProfitTarget] = useState(10);
    const [maxLoss, setMaxLoss] = useState(10);

    const config = useMemo(
        () => ({ strategy, risk, symbol, stake, profitTarget, maxLoss, currency }),
        [strategy, risk, symbol, stake, profitTarget, maxLoss, currency]
    );

    const { ticksReady, isRunning, status, stats, start, stop } = useNexoraBot(config);

    const demoLocked = isDemo && !ALLOW_DEMO_TRADING;

    // Safety: if the account is switched to a locked demo mid-run, stop the bot.
    useEffect(() => {
        if (demoLocked && isRunning) stop();
    }, [demoLocked, isRunning, stop]);

    const inputsValid = stake > 0 && profitTarget > 0 && maxLoss > 0;

    // Only surface status while the bot is doing something (not the idle prompt).
    const showStatus = status.kind !== 'idle';
    const statusTone =
        status.kind === 'error'
            ? 'text-rose-300'
            : status.kind === 'target'
              ? 'text-emerald-300'
              : status.kind === 'trading'
                ? 'text-violet-200'
                : 'text-cyan-200';

    return (
        <div className='flex w-full flex-col gap-4'>
            <div className='card flex flex-col gap-5'>
                {/* Header */}
                <div className='flex items-center gap-3'>
                    <NexoraStar size={32} />
                    <div className='flex-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                            <h1 className='text-lg font-bold text-nexora'>Nexora AI</h1>
                            <span className='rounded-full border border-violet-400/40 bg-violet-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-300'>
                                Free tier
                            </span>
                            <span className='rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300'>
                                Real account only
                            </span>
                        </div>
                        <p className='text-[11px] text-slate-500'>Automated Markov trading engine</p>
                    </div>
                </div>

                {/* Strategy */}
                <div>
                    <h2 className='mb-2 text-xs font-medium text-slate-400'>Strategy</h2>
                    <Segmented options={STRATEGIES} value={strategy} onChange={setStrategy} disabled={isRunning} />
                </div>

                {/* Market + Risk */}
                <div className='grid gap-4 md:grid-cols-2'>
                    <label className='flex flex-col gap-1'>
                        <span className='text-xs font-medium text-slate-400'>Market</span>
                        <select
                            value={symbol}
                            disabled={isRunning}
                            onChange={e => setSymbol(e.target.value)}
                            className='rounded-lg border border-line bg-ink-800 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-cyan-500 disabled:opacity-50'
                        >
                            {MARKETS.map(m => (
                                <option key={m.symbol} value={m.symbol} className='bg-ink-800'>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className='flex flex-col gap-1'>
                        <span className='text-xs font-medium text-slate-400'>Risk level</span>
                        <Segmented options={RISKS} value={risk} onChange={setRisk} disabled={isRunning} />
                        <div
                            className={`mt-1 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                                risk === 'low'
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                    : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                            }`}
                        >
                            <Layers size={14} className='shrink-0' />
                            <span>{riskStakingLabel(risk)}</span>
                        </div>
                    </div>
                </div>

                {/* Money management */}
                <div className='grid gap-4 sm:grid-cols-3'>
                    <NumberField label='Stake per trade' value={stake} onChange={setStake} suffix={currency} disabled={isRunning} />
                    <NumberField
                        label='Profit target'
                        value={profitTarget}
                        onChange={setProfitTarget}
                        suffix={currency}
                        disabled={isRunning}
                    />
                    <NumberField label='Max loss' value={maxLoss} onChange={setMaxLoss} suffix={currency} disabled={isRunning} />
                </div>

                {/* Total P/L only */}
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

                {/* Run */}
                {isRunning ? (
                    <button
                        type='button'
                        onClick={stop}
                        className='flex w-full items-center justify-center gap-2 rounded-full bg-rose-600 px-6 py-3.5 font-bold text-white shadow-[0_0_22px_rgba(244,63,94,0.5)] transition-all hover:bg-rose-500'
                    >
                        <Square size={18} /> Stop
                    </button>
                ) : demoLocked ? (
                    <button type='button' disabled className='btn-nexora w-full cursor-not-allowed py-3.5 text-base'>
                        <Lock size={18} /> Switch to a real account to run
                    </button>
                ) : (
                    <button
                        type='button'
                        onClick={start}
                        disabled={!inputsValid || !ticksReady}
                        className='btn-nexora w-full py-3.5 text-base disabled:cursor-not-allowed disabled:opacity-50'
                    >
                        {!ticksReady ? (
                            'Loading market…'
                        ) : (
                            <>
                                <Play size={18} /> Run Nexora AI
                            </>
                        )}
                    </button>
                )}
                {!demoLocked && !inputsValid && (
                    <p className='flex items-center justify-center gap-1 text-center text-[11px] text-amber-300'>
                        <TriangleAlert size={12} /> Enter a stake, profit target and max loss greater than 0.
                    </p>
                )}
            </div>
        </div>
    );
};

export default TradePilotFree;
