import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { ArrowRight, Crown, Pencil, Target } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import useAccountName from '@/hooks/useAccountName';
import { DEFAULT_THRESHOLD, type GrowthReward } from '@/hooks/useGrowthReward';
import RewardLadder, { RewardLadderSkeleton } from '@/components/dashboard/RewardLadder';
import FestiveWreaths from '@/components/home/FestiveWreaths';
import RewardClaimedModal from '@/components/dashboard/RewardClaimedModal';
import NicknameModal from '@/components/dashboard/NicknameModal';
import useNickname from '@/hooks/useNickname';

interface DashboardHeroProps {
    /**
     * Held by the dashboard rather than fetched here: the card at the foot of
     * the page names the same target, and two reads of it could disagree.
     *
     * Absent for an account the challenge is not offered to — an admin — and
     * the hero then runs as two columns with no challenge panel at all.
     */
    reward?: GrowthReward;
}

const fmt = (value: number): string =>
    value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/**
 * The dashboard's top card: who you are and the way into the bots on the left,
 * the robot in the middle, and the challenge on the right — what it is worth,
 * and how far the account has got toward it.
 *
 * The Lottie is played in its own colours rather than tinted to the brand —
 * recolouring an animation layer by layer is how you get a muddy one.
 */
const DashboardHero = ({ reward }: DashboardHeroProps) => {
    const { activeLoginId } = useAuth();
    // The Deriv first name is no longer shown directly — it seeds the nickname
    // prompt, so the suggestion is already theirs when the modal opens.
    const derivName = useAccountName();
    const {
        nickname,
        shouldPrompt,
        save: saveNickname,
        saving: savingNickname,
        error: nicknameError,
    } = useNickname(activeLoginId);
    const [editingNickname, setEditingNickname] = useState(false);

    // What the user is called anywhere a name is shown: their own, falling back
    // to the account number, which always exists.
    const displayName = nickname ?? activeLoginId;

    // Until the server answers, the challenge names the opening target. After a
    // grant the bar doubles, so the copy must follow it rather than keep
    // promising a figure the account has already passed.
    const threshold = reward?.status?.threshold ?? DEFAULT_THRESHOLD;

    return (
        /* Wrapped so the wreath can break the card's edge. The card clips its
           own overflow for the diagonals behind it, and anything hung on a
           corner inside it is cropped in half — which is exactly what
           happened. */
        <div className='relative'>
            <FestiveWreaths scope='app' corners='one' />

            {/* `challenge` is the anchor the card at the foot of the page scrolls to. */}
            <section
                id='challenge'
                className='relative overflow-hidden rounded-xl border border-line bg-ink-800/50 p-4 sm:p-6'
            >
            {/* Snow over the whole card in December. Three CSS gradients, so
                it costs no element and no canvas — the cheapest festive thing
                in the app and the only one a workspace can really afford. */}
            <div aria-hidden className='festive-app-only festive-snow pointer-events-none absolute inset-0' />

            {/* Two faint diagonals, as in the reference. Decoration only, so it
                is hidden from the reader and cannot catch a pointer. */}
            <div aria-hidden className='pointer-events-none absolute inset-0 overflow-hidden'>
                <span className='absolute -right-10 -top-24 h-72 w-px rotate-[25deg] bg-gradient-to-b from-transparent via-cyan-300/30 to-transparent' />
                <span className='absolute right-24 -top-32 h-80 w-px rotate-[25deg] bg-gradient-to-b from-transparent via-cyan-300/15 to-transparent' />
            </div>

            {/* The phone puts the robot beside the greeting, not under it, so
                the first two columns hold at every width and the challenge
                drops to a row of its own below them. */}
            <div
                className={`relative md:grid md:items-start md:gap-x-4 ${
                    reward
                        ? 'md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.1fr)]'
                        : 'md:grid-cols-[minmax(0,1fr)_auto]'
                }`}
            >
                {/* On a phone the robot floats over the right of the greeting
                    rather than sitting in a column beside it, so it can be
                    drawn far larger than the width the text leaves — which is
                    what the reference does. From `md` this wrapper dissolves
                    (`contents`) and the two become columns of the grid. */}
                <div className='relative md:contents'>
                {/* Left — who you are and the way in. */}
                <div className='flex min-w-0 flex-col items-start pr-32 text-left sm:pr-40 md:pr-0'>
                    {/* 22px on a phone. Poppins is wide: measured on the real
                        page, "Welcome Back," still broke in two at 24px in a
                        column this narrow, taking the Edit pill down with it. */}
                    {/* Two greetings, one of which CSS hides. Swapping them in
                        JavaScript would mean the wrong one in the first paint
                        on the one day of the year it matters. */}
                    <h1 className='app-title font-extrabold leading-tight text-white'>
                        <span className='xmas-day-hide'>Welcome Back,</span>
                        <span className='xmas-day-only font-christmas leading-none'>
                            Merry Christmas,
                        </span>
                    </h1>

                    {displayName && (
                        <button
                            type='button'
                            onClick={() => setEditingNickname(true)}
                            title='Change your nickname'
                            className='group mt-1 inline-flex flex-wrap items-center justify-start gap-x-2.5 gap-y-1'
                        >
                            <span
                                className={`text-[22px] font-extrabold leading-tight text-cyan-400 transition-colors group-hover:text-cyan-300 sm:text-3xl md:text-4xl ${
                                    nickname ? '' : 'font-mono text-lg sm:text-xl md:text-2xl'
                                }`}
                            >
                                {displayName}
                            </span>
                            <span aria-hidden className='text-xl sm:text-2xl md:text-3xl'>
                                👋
                            </span>
                            {/* Always visible, not hover-only: on a phone there
                                is no hover, so an affordance that waits for one
                                is an affordance nobody finds. */}
                            <span className='inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-ink-800 px-2 py-0.5 text-xs font-semibold text-slate-400 transition-colors group-hover:border-cyan-700 group-hover:text-cyan-300'>
                                <Pencil size={12} />
                                Edit
                            </span>
                        </button>
                    )}

                    <p className='mt-3 max-w-sm text-xs leading-relaxed text-slate-400 sm:text-sm'>
                        Your AI trading workspace is ready. Take control, learn, and grow with Nexora.
                    </p>

                    {/* A cyan pill with the arrow in its own disc, as the phone
                        reference draws it. The desktop mockup put this button
                        in amber; amber is kept for the reward actions, which
                        are the gold things on this screen. */}
                    <Link
                        to='/app/trade-pilot-free'
                        className='mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 to-cyan-500 py-1.5 pl-5 pr-1.5 text-sm font-bold text-[#06141a] shadow-[0_2px_14px_rgba(34,211,238,0.35)] transition-all hover:from-cyan-200 hover:to-cyan-400'
                    >
                        Start Trading
                        <span className='flex h-7 w-7 items-center justify-center rounded-full bg-[#06141a]/15'>
                            <ArrowRight size={15} />
                        </span>
                    </Link>
                </div>

                {/* Middle — the robot, lit from below. */}
                <div className='absolute -right-2 top-1/2 flex -translate-y-1/2 items-end justify-center md:static md:translate-y-0 md:self-center'>
                    {/* The light it stands in. All decoration, so it is hidden
                        from readers and cannot take a pointer. Held inside the
                        robot's own column rather than the card's background, so
                        it follows the robot when the columns reflow. */}
                    <div
                        aria-hidden
                        className='pointer-events-none absolute inset-0 flex items-center justify-center'
                    >
                        <span className='h-36 w-36 rounded-full bg-cyan-400/20 blur-3xl sm:h-48 sm:w-48 md:h-56 md:w-56' />
                    </div>

                    {/* The pad under its feet: a wash, then two rings, the inner
                        one brightest — the glow falls off outward. */}
                    <div
                        aria-hidden
                        className='pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center justify-end'
                    >
                        <span className='absolute bottom-1 h-8 w-32 rounded-[100%] bg-cyan-400/25 blur-lg sm:w-44' />
                        <span className='absolute bottom-2 h-5 w-24 rounded-[100%] border border-cyan-300/40 sm:w-32' />
                        <span className='absolute bottom-3 h-3 w-14 rounded-[100%] border border-cyan-300/70 shadow-[0_0_18px_rgba(34,211,238,0.65)] sm:w-20' />
                    </div>

                    {/* A few motes in the light. */}
                    <div aria-hidden className='pointer-events-none absolute inset-0'>
                        <span className='absolute left-2 top-10 h-1 w-1 rounded-full bg-cyan-300/70 blur-[1px]' />
                        <span className='absolute right-3 top-6 h-1.5 w-1.5 rounded-full bg-cyan-300/50 blur-[1px]' />
                        <span className='absolute right-6 bottom-12 h-1 w-1 rounded-full bg-emerald-300/60 blur-[1px]' />
                        <span className='absolute left-5 bottom-8 h-1 w-1 rounded-full bg-cyan-200/60 blur-[1px]' />
                    </div>

                    <DotLottieReact
                        src='/hero.json'
                        loop
                        autoplay
                        className='relative h-44 w-44 shrink-0 sm:h-52 sm:w-52 md:h-52 md:w-52'
                    />
                </div>
                </div>

                {/* Right — the challenge, for the accounts it is offered to. */}
                {reward && (
                <div className='mt-5 md:mt-0 md:self-center'>
                    {/* Ringed in amber but not filled with it. The reference
                        draws a gold line around this panel over the same dark
                        ground as every other card; a gold wash behind it was
                        the thing that read wrong. */}
                    <div className='rounded-xl border border-amber-400/40 bg-ink-800/40 p-3 sm:p-4'>
                        {/* The greeting is the desktop hero's; the phone layout
                            leads with the challenge itself, which is the part
                            that fits a narrow column. */}
                        <div className='hidden items-center gap-3 md:flex'>
                            <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-400/50 bg-amber-400/10'>
                                <Crown size={18} className='text-amber-300' />
                            </span>
                            <p className='min-w-0 flex-1 rounded-lg border border-amber-400/40 bg-ink-800/70 px-3 py-2 text-sm font-bold leading-snug text-white sm:text-base'>
                                Hello{displayName ? ` ${displayName}` : ''}, I have a challenge for{' '}
                                <span className='text-cyan-400'>YOU!</span>
                            </p>
                        </div>

                        <div className='flex items-start gap-3 md:mt-3'>
                            <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-400/50 bg-amber-400/10 md:border-0 md:bg-transparent'>
                                <Crown size={18} className='text-amber-300 md:hidden' />
                                <Target size={18} className='hidden text-amber-300 md:block' />
                            </span>
                            <div className='min-w-0 flex-1'>
                                <p className='text-xs font-bold uppercase tracking-wider text-amber-400'>
                                    Challenge just for YOU !
                                </p>
                                <p className='mt-1 text-sm leading-relaxed text-slate-300'>
                                    Trade to a profit target of{' '}
                                    <span className='font-semibold text-white'>${fmt(threshold)}</span> to get{' '}
                                    <span className='text-premium font-bold'>Nexora AI premium</span> 3 days for
                                    FREE!
                                </p>
                            </div>
                        </div>

                        <div className='mt-3'>
                            {!reward.status && !reward.statusError && <RewardLadderSkeleton />}

                            {reward.statusError && (
                                <p className='rounded-xl border border-rose-900/60 bg-rose-950/30 px-3 py-2 text-xs text-rose-300'>
                                    {reward.statusError}
                                </p>
                            )}

                            {reward.status && (
                                <RewardLadder
                                    profit={reward.status.profit}
                                    threshold={reward.status.threshold}
                                    claimable={reward.status.claimable}
                                    claiming={reward.claiming}
                                    error={reward.claimError}
                                    onClaim={reward.claim}
                                />
                            )}
                        </div>
                    </div>
                </div>
                )}
            </div>

            {(shouldPrompt || editingNickname) && (
                <NicknameModal
                    suggestion={derivName}
                    initial={nickname}
                    saving={savingNickname}
                    error={nicknameError}
                    onSave={saveNickname}
                    onDone={() => setEditingNickname(false)}
                />
            )}

            {reward?.grant && <RewardClaimedModal grant={reward.grant} onClose={reward.dismissGrant} />}
            </section>
        </div>
    );
};

export default DashboardHero;
