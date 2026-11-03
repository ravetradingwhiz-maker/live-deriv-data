import { createPortal } from 'react-dom';
import { CalendarClock, Crown, Equal, Trophy, X } from 'lucide-react';
import type { GrowthRewardGrant } from '@/services/rewards-api';

interface Props {
    grant: GrowthRewardGrant;
    onClose: () => void;
}

const TIER_LABEL: Record<string, string> = { alpha: 'Alpha', quantum: 'Quantum', apex: 'Apex' };

const fmtDate = (iso: string): string =>
    new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/**
 * Shown once a growth reward is claimed. Modelled on BotResultModal: portaled
 * to <body> so it sits above the header's backdrop-blur layers.
 *
 * The prizes named here are the ones actually unlocked — the tier, the bot it
 * opens, and how long it lasts — rather than a generic trophy case.
 */
const RewardClaimedModal = ({ grant, onClose }: Props) => {
    const tier = TIER_LABEL[grant.tier] ?? grant.tier;

    const prizes = [
        { icon: Crown, label: tier, sub: 'Premium' },
        { icon: Equal, label: 'Matches', sub: 'Printer' },
        { icon: CalendarClock, label: `${grant.days} days`, sub: `Until ${fmtDate(grant.expiresAt)}` },
    ];

    return createPortal(
        <div
            className='fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm'
            onClick={onClose}
            role='dialog'
            aria-modal='true'
        >
            <div
                onClick={e => e.stopPropagation()}
                className='relative w-full max-w-sm overflow-hidden rounded-2xl border border-amber-400/40 bg-ink-800 p-6 text-center shadow-2xl'
            >
                <div className='pointer-events-none absolute -top-16 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-amber-400/30 blur-3xl' />

                <button
                    type='button'
                    onClick={onClose}
                    aria-label='Close'
                    className='absolute right-3 top-3 text-slate-400 transition-colors hover:text-white'
                >
                    <X size={18} />
                </button>

                <div className='relative flex flex-col items-center gap-3'>
                    <div className='flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/15 text-amber-300'>
                        <Trophy size={28} />
                    </div>

                    <h2 className='text-lg font-extrabold text-white'>Challenge complete! 🎉</h2>

                    <p className='text-sm text-slate-300'>
                        You traded to a profit of ${grant.profit.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                        })}
                        . Nexora AI {tier} premium is yours for {grant.days} days.
                    </p>

                    <div className='mt-1 grid w-full grid-cols-3 gap-2'>
                        {prizes.map(({ icon: Icon, label, sub }) => (
                            <div
                                key={label}
                                className='flex flex-col items-center gap-1 rounded-xl border border-line bg-ink-900/60 p-3'
                            >
                                <Icon size={22} className='text-amber-300' />
                                <p className='text-xs font-bold leading-tight text-white'>{label}</p>
                                <p className='text-[10px] leading-tight text-slate-500'>{sub}</p>
                            </div>
                        ))}
                    </div>

                    <p className='text-xs text-slate-500'>
                        Next challenge: trade to a profit of $
                        {grant.threshold.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>

                    <button
                        type='button'
                        onClick={onClose}
                        className='mt-1 w-full rounded-lg bg-amber-400 px-6 py-2.5 font-bold text-[#1a1205] transition-colors hover:bg-amber-300'
                    >
                        Awesome
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default RewardClaimedModal;
