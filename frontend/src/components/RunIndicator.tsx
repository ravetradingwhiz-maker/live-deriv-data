import { useAuth } from '@/context/AuthContext';
import { useBotRun } from '@/context/BotRunContext';
import { usePortfolio } from '@/context/PortfolioContext';
import { getActiveCurrency } from '@/services/trade-api';
import { fmtSigned } from '@/utils/contract-format';

/**
 * Whether a bot is running, and what the session has made, in the app header.
 *
 * Both figures already existed, but only behind the positions panel — which on
 * a desktop is a 36px strip down the right edge. "Is it still trading?" is the
 * question a person asks most while a bot is on, and it was the one thing the
 * app would not answer without opening something.
 *
 * It reports and does not act: the panel is a hand's width away and owns the
 * controls. Hidden on a phone, where the panel's own collapsed bar already runs
 * across the top of the page carrying the same two things.
 */
const RunIndicator = () => {
    const { isRunning } = useBotRun();
    const { sessionStats } = usePortfolio();
    const { balanceCurrency } = useAuth();
    const currency = balanceCurrency || getActiveCurrency();
    const { runs, totalProfit } = sessionStats;

    // Nothing running and nothing settled is nothing to say. An empty chip
    // sitting in the bar would be chrome rather than information.
    if (!isRunning && runs === 0) return null;

    return (
        <div className='hidden items-center gap-2.5 rounded-full border border-line bg-ink-800 px-3 py-1.5 md:flex'>
            {isRunning && (
                <span className='flex items-center gap-1.5 text-xs font-semibold text-cyan-300'>
                    <span className='relative flex h-2 w-2'>
                        {/* The one piece of motion in the bar, and it is saying
                            something: a trade could land at any moment. */}
                        <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75 motion-reduce:animate-none' />
                        <span className='relative inline-flex h-2 w-2 rounded-full bg-cyan-400' />
                    </span>
                    Running
                </span>
            )}
            {runs > 0 && (
                <span
                    title={`${runs} ${runs === 1 ? 'trade' : 'trades'} this session`}
                    className={`text-xs font-bold tabular-nums ${
                        totalProfit > 0 ? 'text-emerald-400' : totalProfit < 0 ? 'text-rose-400' : 'text-slate-300'
                    }`}
                >
                    {fmtSigned(totalProfit)} {currency}
                </span>
            )}
        </div>
    );
};

export default RunIndicator;
