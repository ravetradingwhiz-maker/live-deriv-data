import { ChevronDown } from 'lucide-react';
import TradeTypeIcon from '@/components/trade-type/TradeTypeIcon';
import { DURATION_UNIT_LABELS, type ContractType } from '@/constants/contracts';
import type { ProposalData } from '@/services/trade-api';

export type Dir = 'up' | 'down';

interface TradePanelProps {
    contract: ContractType;
    onOpenContractModal: () => void;
    currency: string;
    isDemo: boolean;
    symbolCode: string;
    currentQuote: number | null;
    decimals: number;
    stake: number;
    setStake: (v: number) => void;
    duration: number;
    setDuration: (v: number) => void;
    unit: string;
    setUnit: (v: string) => void;
    barrierDigit: number;
    setBarrierDigit: (v: number) => void;
    barrierOffset: string;
    setBarrierOffset: (v: string) => void;
    upProp: ProposalData | null;
    downProp: ProposalData | null;
    proposalError: string | null;
    buying: Dir | null;
    onBuy: (dir: Dir) => void;
}

const fmtPayout = (p: ProposalData | null, currency: string) =>
    p && Number.isFinite(p.payout) ? `${Number(p.payout).toFixed(2)} ${currency}` : '—';

const SideButton = ({
    side,
    payout,
    currency,
    busy,
    onClick,
}: {
    side: ContractType['up'];
    payout: ProposalData | null;
    currency: string;
    busy: boolean;
    onClick: () => void;
}) => {
    const up = side.dir === 'up';
    return (
        <button
            onClick={onClick}
            disabled={busy}
            className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left font-bold text-white transition-colors disabled:opacity-60 ${
                up
                    ? 'bg-emerald-600 shadow-lg shadow-emerald-900/40 hover:bg-emerald-500'
                    : 'bg-rose-600 shadow-lg shadow-rose-900/40 hover:bg-rose-500'
            }`}
        >
            <span className='flex items-center gap-2'>
                <TradeTypeIcon type={side.icon} size='sm' />
                {busy ? 'Buying…' : side.label}
            </span>
            <span className='text-right text-[11px] font-semibold'>
                <span className='block opacity-80'>Payout</span>
                {fmtPayout(payout, currency)}
            </span>
        </button>
    );
};

const TradePanel = (props: TradePanelProps) => {
    const {
        contract,
        onOpenContractModal,
        currency,
        isDemo,
        symbolCode,
        currentQuote,
        decimals,
        stake,
        setStake,
        duration,
        setDuration,
        unit,
        setUnit,
        barrierDigit,
        setBarrierDigit,
        barrierOffset,
        setBarrierOffset,
        upProp,
        downProp,
        proposalError,
        buying,
        onBuy,
    } = props;

    return (
        <div className='flex flex-col gap-3 text-sm'>
            {/* Live price header */}
            <div className='text-center'>
                <p className='text-xs text-slate-500'>{symbolCode}</p>
                <p className='font-mono text-2xl font-extrabold text-white'>
                    {Number.isFinite(currentQuote as number)
                        ? (currentQuote as number).toFixed(decimals || 2)
                        : '—'}
                </p>
                <p className='flex items-center justify-center gap-1 text-[10px] font-semibold text-emerald-400'>
                    <span className='h-1.5 w-1.5 rounded-full bg-emerald-400' /> LIVE
                </p>
            </div>

            {/* Contract type selector */}
            <div>
                <p className='mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500'>Contract type</p>
                <button
                    onClick={onOpenContractModal}
                    className='flex w-full items-center gap-2 rounded-lg border border-line bg-ink-900 px-3 py-2 hover:border-cyan-700'
                >
                    <span className='flex h-7 w-7 items-center justify-center rounded-md bg-ink-700'>
                        <TradeTypeIcon type={contract.up.icon} size='sm' />
                    </span>
                    <span className='flex-1 text-left text-sm font-semibold text-white'>{contract.name}</span>
                    <ChevronDown size={16} className='text-slate-400' />
                </button>
            </div>

            {/* Stake */}
            <label className='block'>
                <span className='text-xs font-semibold uppercase tracking-wider text-slate-500'>Stake</span>
                <div className='mt-1 flex items-center gap-2 rounded-lg border border-line bg-ink-900 px-3'>
                    <span className='text-xs text-slate-500'>{currency}</span>
                    <input
                        type='number'
                        min={0}
                        value={stake}
                        onChange={e => setStake(Math.max(0, Number(e.target.value)))}
                        className='w-full bg-transparent py-2 font-mono text-sm text-white focus:outline-none'
                    />
                </div>
            </label>

            {/* Duration */}
            <div>
                <span className='text-xs font-semibold uppercase tracking-wider text-slate-500'>Duration</span>
                <div className='mt-1 flex gap-2'>
                    <input
                        type='number'
                        min={1}
                        value={duration}
                        onChange={e => setDuration(Math.max(1, Number(e.target.value)))}
                        className='w-full rounded-lg border border-line bg-ink-900 px-3 py-2 font-mono text-sm text-white focus:outline-none'
                    />
                    <select
                        value={unit}
                        onChange={e => setUnit(e.target.value)}
                        className='rounded-lg border border-line bg-ink-900 px-2 py-2 text-sm text-white focus:outline-none'
                    >
                        {contract.durationUnits.map(u => (
                            <option key={u} value={u}>
                                {DURATION_UNIT_LABELS[u]}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Barrier — digit grid */}
            {contract.barrier === 'digit' && (
                <div>
                    <p className='mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500'>
                        {contract.id === 'over_under' ? 'Barrier digit' : 'Prediction'}
                    </p>
                    <div className='grid grid-cols-5 gap-1'>
                        {Array.from({ length: 10 }, (_, d) => (
                            <button
                                key={d}
                                onClick={() => setBarrierDigit(d)}
                                className={`flex h-8 items-center justify-center rounded-md text-sm font-bold ${
                                    d === barrierDigit
                                        ? 'bg-cyan-600 text-white'
                                        : 'border border-line bg-ink-900 text-slate-300 hover:border-cyan-700'
                                }`}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Barrier — offset */}
            {contract.barrier === 'offset' && (
                <label className='block'>
                    <span className='text-xs font-semibold uppercase tracking-wider text-slate-500'>Barrier</span>
                    <input
                        value={barrierOffset}
                        onChange={e => setBarrierOffset(e.target.value)}
                        placeholder='+0.10'
                        className='mt-1 w-full rounded-lg border border-line bg-ink-900 px-3 py-2 font-mono text-sm text-white focus:outline-none'
                    />
                </label>
            )}

            {proposalError && (
                <p className='rounded-lg border border-rose-900 bg-rose-950/40 px-3 py-2 text-xs text-rose-300'>
                    {proposalError}
                </p>
            )}

            {/* Buy buttons */}
            <div className='space-y-2'>
                <SideButton
                    side={contract.up}
                    payout={upProp}
                    currency={currency}
                    busy={buying === 'up'}
                    onClick={() => onBuy('up')}
                />
                <SideButton
                    side={contract.down}
                    payout={downProp}
                    currency={currency}
                    busy={buying === 'down'}
                    onClick={() => onBuy('down')}
                />
            </div>

            <span
                className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    isDemo ? 'bg-amber-500/15 text-amber-300' : 'bg-cyan-500/15 text-cyan-300'
                }`}
            >
                {isDemo ? 'DEMO' : 'REAL'}
            </span>
        </div>
    );
};

export default TradePanel;
