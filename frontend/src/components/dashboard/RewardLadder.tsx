import { Gift } from 'lucide-react';

interface RewardLadderProps {
    /** All-time realised profit, as the server read it. */
    profit: number;
    /** What the next grant costs. Doubles after each one. */
    threshold: number;
    granted: boolean;
}

const fmt = (value: number): string =>
    value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** Progress toward the next growth reward. */
const RewardLadder = ({ profit, threshold, granted }: RewardLadderProps) => {
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
                    className='h-full rounded-full bg-amber-400 transition-[width] duration-500'
                    style={{ width: `${pct * 100}%` }}
                />
            </div>

            {granted && <p className='mt-2 text-xs font-semibold text-emerald-400'>3 days Alpha unlocked</p>}
        </div>
    );
};

export default RewardLadder;
