import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useFestivePlayback, usePlayers, useWideEnough } from '@/hooks/useFestivePerf';

/**
 * The December hero: snow falling, a treeline along the bottom edge, and
 * Father Christmas beside the headline.
 *
 * Everything is decoration, so the whole scene is `aria-hidden` and sits
 * behind the content. It shows only when <html> carries `festive`, which the
 * admin Settings page switches.
 *
 * The animations are served from this app rather than from lottie.host: a
 * hero that depends on a third party staying up is a hero that breaks when
 * it does not, and decoration should fail to nothing rather than to a gap.
 */

/**
 * Where the trees stand, as percentages of the hero's width.
 *
 * The first six are the whole treeline on a phone; the rest fill it in once
 * there is room. Ordered so that the short list is still spread across the
 * width rather than bunched at one end.
 */
const TREES: { left: string; height: string }[] = [
    { left: '3%', height: '60%' },
    { left: '26%', height: '52%' },
    { left: '50%', height: '56%' },
    { left: '90%', height: '76%' },
    { left: '14%', height: '84%' },
    { left: '62%', height: '80%' },
    { left: '38%', height: '72%' },
    { left: '76%', height: '54%' },
];

/** How many of them a phone gets. Each one is a canvas repainting every frame. */
const TREES_ON_MOBILE = 4;

const FestiveScene = () => {
    const wide = useWideEnough(640);
    /* Stopped when the tab is in the background or the page has scrolled a
       screen past the hero. Without it the scene repaints for the whole time
       someone spends reading the rest of the page. */
    const running = useFestivePlayback();
    const collect = usePlayers(running);

    const trees = wide ? TREES : TREES.slice(0, TREES_ON_MOBILE);

    return (
        <div aria-hidden='true' className='festive-only pointer-events-none absolute inset-0 overflow-hidden'>
            {/* Snow across the whole section, behind everything else. Three
                gradient layers rather than elements, so it costs no DOM. */}
            <div className='festive-snow absolute inset-0' />

            {/* Father Christmas, in two places for two shapes of screen.
                On a phone he stands at the right edge beside the buttons,
                at full strength — he is the only piece of scenery there, so
                there is nothing for him to stay out of the way of. From `sm` up the hero is two columns and the gap beside
                the headline opens, which is where he belongs — big enough to
                be scenery and set back far enough to stay behind the words. */}
            <div className='absolute -right-4 top-[19%] h-56 w-56 sm:left-[28%] sm:opacity-40 sm:right-auto sm:top-8 sm:h-96 sm:w-96 lg:left-[26%] lg:h-[30rem] lg:w-[30rem]'>
                <DotLottieReact
                    src='/festive/santa.lottie'
                    loop
                    autoplay={running}
                    dotLottieRefCallback={collect}
                    className='h-full w-full'
                />
            </div>

            {/* The bank along the bottom of the hero, deep enough for the
                trees to stand up out of it and on screen before any scroll. */}
            <div className='absolute inset-x-0 bottom-0 h-36 sm:h-56'>
                {trees.map(tree => (
                    <div
                        key={tree.left}
                        className='absolute bottom-5 aspect-square -translate-x-1/2 sm:bottom-8'
                        style={{ left: tree.left, height: tree.height }}
                    >
                        <DotLottieReact
                            src='/festive/trees.lottie'
                            loop
                            autoplay={running}
                            speed={0.9}
                            dotLottieRefCallback={collect}
                            className='h-full w-full'
                        />
                    </div>
                ))}

                {/* Laid over the trunks, so the trees stand IN the snow
                    rather than on top of it. */}
                <svg
                    viewBox='0 0 1200 120'
                    preserveAspectRatio='none'
                    className='absolute inset-x-0 bottom-0 h-16 w-full sm:h-24'
                    role='presentation'
                >
                    <path
                        d='M0 56 q90 -30 190 -8 q110 24 220 -4 q120 -30 250 2 q120 28 250 -8 q150 -40 290 8 L1200 120 L0 120 Z'
                        fill='rgb(var(--festive-snow))'
                        opacity='0.95'
                    />
                </svg>
            </div>
        </div>
    );
};

export default FestiveScene;
