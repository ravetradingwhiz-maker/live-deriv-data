import { Gift, Loader2 } from 'lucide-react';

interface RewardLadderProps {
    /** All-time realised profit, as the server read it. */
    profit: number;
    /** What the next grant costs. Doubles after each one. */
    threshold: number;
    claimable: boolean;
    claiming: boolean;
    error: string | null;
    onClaim: () => void;
}

const fmt = (value: number): string =>
    value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** Progress toward the next growth reward, and the claim once the bar is full. */
const RewardLadder = ({ profit, threshold, claimable, claiming, error, onClaim }: RewardLadderProps) => {
    const pct = threshold > 0 ? Math.max(0, Math.min(1, profit / threshold)) : 0;

    return (
        <div className='rounded-xl border border-line bg-ink-800 p-3'>
            <div className='flex items-center gap-2'>
                <Gift size={16} className='shrink-0 text-amber-400' />
                <p className='text-sm text-slate-300'>
                    <span className='font-mono font-semibold text-white'>${fmt(Math.max(0, profit))}</span>
                    <span className='text-slate-500'> of </span>
                    <span className='font-mono font-semibold text-white'>${fmt(threshold)}</span>
                </p>
            </div>

            <div className='mt-2.5 h-2 overflow-hidden rounded-full bg-ink-600'>
                <div
                    className={`h-full rounded-full transition-[width] duration-500 ${
                        claimable ? 'bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.8)]' : 'bg-amber-400'
                    }`}
                    style={{ width: `${pct * 100}%` }}
                />
            </div>

            {claimable && (
                <button
                    type='button'
                    onClick={onClaim}
                    disabled={claiming}
                    className='mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-[#1a1205] transition-colors hover:bg-amber-300 disabled:opacity-60'
                >
                    {claiming && <Loader2 size={14} className='animate-spin' />}
                    Claim
                </button>
            )}

            {error && <p className='mt-2 text-xs text-rose-400'>{error}</p>}
        </div>
    );
};

export default RewardLadder;
