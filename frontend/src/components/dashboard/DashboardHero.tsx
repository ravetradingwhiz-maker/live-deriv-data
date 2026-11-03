import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Pencil } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import useAccountName from '@/hooks/useAccountName';
import useGrowthReward, { DEFAULT_THRESHOLD } from '@/hooks/useGrowthReward';
import RewardLadder, { RewardLadderSkeleton } from '@/components/dashboard/RewardLadder';
import RewardClaimedModal from '@/components/dashboard/RewardClaimedModal';
import SpeechBubble from '@/components/dashboard/SpeechBubble';
import NicknameModal from '@/components/dashboard/NicknameModal';
import useNickname from '@/hooks/useNickname';

interface DashboardHeroProps {
    /** Month profit, watched so a closing trade re-checks the ladder. */
    monthProfit: number;
}

const fmt = (value: number): string =>
    value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/**
 * The dashboard's top card: the greeting and the way into the bots on the left,
 * the robot in the middle, and the robot's own words on the right — a bubble
 * at its head, the challenge beneath it, and how far the account has got
 * toward winning it.
 *
 * The Lottie is played in its own colours rather than tinted to the brand —
 * recolouring an animation layer by layer is how you get a muddy one.
 */
const DashboardHero = ({ monthProfit }: DashboardHeroProps) => {
    const { activeLoginId } = useAuth();
    // The Deriv first name is no longer shown directly — it seeds the nickname
    // prompt, so the suggestion is already theirs when the modal opens.
    const derivName = useAccountName();
    const { nickname, shouldPrompt, save: saveNickname } = useNickname(activeLoginId);
    const [editingNickname, setEditingNickname] = useState(false);
    const { status, statusError, grant, claiming, claimError, claim, dismissGrant } =
        useGrowthReward(monthProfit);

    // What the user is called anywhere a name is shown: their own, falling back
    // to the account number, which always exists.
    const displayName = nickname ?? activeLoginId;

    // Until the server answers, the challenge names the opening target. After a
    // grant the bar doubles, so the copy must follow it rather than keep
    // promising a figure the account has already passed.
    const threshold = status?.threshold ?? DEFAULT_THRESHOLD;

    return (
        <section className='rounded-xl border border-line bg-ink-800/50 p-4 sm:p-6'>
            {/* The robot and its bubble sit side by side at every width, so the
                bubble is always at the robot's head and its spike always points
                at it. On a phone the greeting takes a row above them and the
                challenge a row below; on desktop those become the outer columns. */}
            <div className='grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.15fr)] md:gap-x-2'>
                {/* Left — greeting, account, and the way in. */}
                <div className='col-span-2 flex flex-col items-center text-center md:col-span-1 md:row-span-2 md:items-start md:text-left'>
                    <h1 className='text-3xl font-bold leading-tight text-white sm:text-4xl'>Welcome Back!</h1>
                    {displayName && (
                        <button
                            type='button'
                            onClick={() => setEditingNickname(true)}
                            title='Change your nickname'
                            className={`group mt-1.5 inline-flex items-center gap-2 text-2xl font-extrabold leading-tight text-cyan-400 transition-colors hover:text-cyan-300 sm:text-3xl ${
                                nickname ? '' : 'font-mono text-xl sm:text-2xl'
                            }`}
                        >
                            {displayName}
                            <Pencil size={16} className='shrink-0 opacity-0 transition-opacity group-hover:opacity-100' />
                        </button>
                    )}
                    <Link
                        to='/app/trade-pilot-free'
                        className='mt-4 inline-flex items-center justify-center rounded-lg bg-gradient-to-r md:mt-10 from-amber-300 to-amber-500 px-6 py-2.5 text-sm font-bold text-[#1a1205] shadow-[0_2px_12px_rgba(245,158,11,0.35)] transition-all hover:from-amber-200 hover:to-amber-400'
                    >
                        Start Trading
                    </Link>
                </div>

                {/* Middle — the robot. */}
                <div className='flex justify-center md:row-span-2 md:-mr-1'>
                    <DotLottieReact
                        src='/hero.json'
                        loop
                        autoplay
                        className='h-32 w-32 shrink-0 sm:h-44 sm:w-44 md:h-48 md:w-48'
                    />
                </div>

                {/* The bubble, held level with the robot's head. */}
                <div className='min-w-0 self-start pt-3 sm:pt-6 md:pt-8'>
                    <SpeechBubble>
                        <p className='text-sm font-bold leading-snug text-bubble-fg sm:text-lg'>
                            Hello{displayName ? ` ${displayName}` : ''}, I have a challenge for YOU!
                        </p>
                    </SpeechBubble>
                </div>

                {/* The challenge and how far the account has got toward it. */}
                <div className='col-span-2 flex flex-col gap-3 md:col-span-1'>
                    <div>
                        <p className='text-xs font-semibold uppercase tracking-wider text-amber-400 underline decoration-amber-400/50 underline-offset-4'>
                            Challenge just for YOU !
                        </p>
                        <p className='mt-1 text-sm leading-relaxed text-slate-300'>
                            Trade to a profit target of{' '}
                            <span className='font-semibold text-white'>${fmt(threshold)}</span> to get{' '}
                            <span className='text-premium font-bold'>Nexora AI premium</span> 3 days for FREE!
                        </p>
                    </div>

                    {!status && !statusError && <RewardLadderSkeleton />}

                    {statusError && (
                        <p className='rounded-xl border border-rose-900/60 bg-rose-950/30 px-3 py-2 text-xs text-rose-300'>
                            {statusError}
                        </p>
                    )}

                    {status && (
                        <RewardLadder
                            profit={status.profit}
                            threshold={status.threshold}
                            claimable={status.claimable}
                            claiming={claiming}
                            error={claimError}
                            onClaim={claim}
                        />
                    )}
                </div>
            </div>

            {(shouldPrompt || editingNickname) && (
                <NicknameModal
                    suggestion={derivName}
                    initial={nickname}
                    onSave={saveNickname}
                    onDone={() => setEditingNickname(false)}
                />
            )}

            {grant && <RewardClaimedModal grant={grant} onClose={dismissGrant} />}
        </section>
    );
};

export default DashboardHero;
