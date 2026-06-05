import { createPortal } from 'react-dom';
import { PartyPopper, ShieldAlert, X } from 'lucide-react';
import type { SessionResult } from '@/hooks/useNexoraBot';

const fmt = (value: number, currency: string): string =>
    `${value >= 0 ? '+' : '-'}${Math.abs(value).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} ${currency}`.trim();

interface Props {
    result: SessionResult;
    onClose: () => void;
}

/**
 * Celebratory (target hit) / protective (max loss hit) modal shown once a bot
 * session ends on a money-management boundary. Portaled to <body> so it sits
 * above the header/backdrop-blur layers.
 */
const BotResultModal = ({ result, onClose }: Props) => {
    const isTarget = result.reason === 'target';

    return createPortal(
        <div
            className='fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm'
            onClick={onClose}
            role='dialog'
            aria-modal='true'
        >
            <div
                onClick={e => e.stopPropagation()}
                className={`relative w-full max-w-sm overflow-hidden rounded-2xl border bg-ink-800 p-6 text-center shadow-2xl ${
                    isTarget ? 'border-emerald-400/40' : 'border-rose-400/40'
                }`}
            >
                {/* Glow accent */}
                <div
                    className={`pointer-events-none absolute -top-16 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full blur-3xl ${
                        isTarget ? 'bg-emerald-400/30' : 'bg-rose-400/25'
                    }`}
                />

                <button
                    type='button'
                    onClick={onClose}
                    aria-label='Close'
                    className='absolute right-3 top-3 text-slate-400 transition-colors hover:text-white'
                >
                    <X size={18} />
                </button>

                <div className='relative flex flex-col items-center gap-3'>
                    <div
                        className={`flex h-14 w-14 items-center justify-center rounded-full ${
                            isTarget
                                ? 'bg-emerald-400/15 text-emerald-300'
                                : 'bg-rose-400/15 text-rose-300'
                        }`}
                    >
                        {isTarget ? <PartyPopper size={28} /> : <ShieldAlert size={28} />}
                    </div>

                    <h2 className='text-lg font-extrabold text-white'>
                        {isTarget ? 'Congratulations! 🎉' : 'Max loss reached'}
                    </h2>

                    <p className='text-sm text-slate-300'>
                        {isTarget ? (
                            <>
                                You've reached your target profit. Nexora AI has stopped trading to
                                lock in your gains. Great session!
                            </>
                        ) : (
                            <>
                                Your max loss limit was hit, so Nexora AI stopped trading to protect
                                your balance. Review your settings before running again.
                            </>
                        )}
                    </p>

                    {/* Session summary */}
                    <div className='mt-1 w-full rounded-xl border border-line bg-ink-900/60 p-3'>
                        <div className='flex items-center justify-between text-sm'>
                            <span className='text-slate-400'>Net profit</span>
                            <span
                                className={`font-mono font-bold ${
                                    result.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                            >
                                {fmt(result.netProfit, result.currency)}
                            </span>
                        </div>
                        <div className='mt-2 grid grid-cols-3 gap-2 text-center text-xs'>
                            <div>
                                <p className='font-bold text-white'>{result.trades}</p>
                                <p className='text-slate-500'>Trades</p>
                            </div>
                            <div>
                                <p className='font-bold text-emerald-400'>{result.wins}</p>
                                <p className='text-slate-500'>Wins</p>
                            </div>
                            <div>
                                <p className='font-bold text-rose-400'>{result.losses}</p>
                                <p className='text-slate-500'>Losses</p>
                            </div>
                        </div>
                    </div>

                    <button
                        type='button'
                        onClick={onClose}
                        className={`mt-1 w-full rounded-full px-6 py-2.5 font-bold transition-all ${
                            isTarget
                                ? 'bg-emerald-500 text-[#06141a] hover:bg-emerald-400'
                                : 'bg-rose-500 text-white hover:bg-rose-400'
                        }`}
                    >
                        {isTarget ? 'Awesome' : 'Got it'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BotResultModal;
