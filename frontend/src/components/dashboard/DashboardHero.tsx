import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useAuth } from '@/context/AuthContext';

/**
 * The dashboard's hero: the robot, a card speaking to the user, and the
 * greeting naming the account they are signed in as.
 *
 * The Lottie is played in its own colours rather than tinted to the brand —
 * recolouring an animation layer by layer is how you get a muddy one.
 */
const DashboardHero = () => {
    const { activeLoginId } = useAuth();

    return (
        <section className='relative flex flex-col items-center gap-2 overflow-hidden rounded-xl border border-line bg-ink-800/50 px-4 py-6'>
            <div className='relative'>
                {/* Speech bubble, with a border-triangle tail pointing at the robot. */}
                <div className='absolute -left-2 top-0 z-10 rounded-xl rounded-br-sm border border-line bg-ink-800 px-3 py-1.5 shadow-lg shadow-black/40 sm:-left-8'>
                    <span className='text-sm font-semibold text-white'>Hello</span>
                    <span
                        aria-hidden
                        className='absolute -bottom-[7px] right-2 h-0 w-0 border-l-[7px] border-t-[7px] border-l-transparent border-t-line'
                    />
                </div>

                <DotLottieReact
                    src='/hero.json'
                    loop
                    autoplay
                    className='h-44 w-44 sm:h-56 sm:w-56'
                />
            </div>

            <h1 className='text-center text-xl font-bold text-white sm:text-2xl'>
                Welcome Back,
                {activeLoginId && (
                    <span className='ml-2 font-mono text-cyan-400'>{activeLoginId}</span>
                )}
            </h1>
        </section>
    );
};

export default DashboardHero;
