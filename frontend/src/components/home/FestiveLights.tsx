import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useFestivePlayback, usePlayers, useWideEnough } from '@/hooks/useFestivePerf';

/**
 * Ornaments hung along the home header.
 *
 * One animation repeated across the bar rather than stretched: the file is a
 * square group of baubles, and stretching a square to the width of a page
 * turns round things into ovals. Repeating keeps them round and lets each
 * copy run at its own speed, so the row moves like ornaments rather than
 * like one object copied six times.
 *
 * Decoration, so the strip is `aria-hidden` and ignores pointers.
 */

/** How many hang across the bar, and how many a phone gets. */
const COPIES = 6;
const COPIES_ON_MOBILE = 3;

const FestiveLights = () => {
    const wide = useWideEnough(640);
    /* The header is sticky, so these are always technically on screen — which
       is exactly why they needed stopping by hand. They ran for the whole
       time anyone spent on the page. */
    const running = useFestivePlayback();
    const collect = usePlayers(running);
    const copies = wide ? COPIES : COPIES_ON_MOBILE;

    return (
        <div
            aria-hidden='true'
            className='festive-only pointer-events-none absolute inset-x-0 top-full flex justify-between overflow-visible px-2'
        >
            {Array.from({ length: copies }, (_, i) => (
                <div key={i} className='h-10 w-10 sm:h-16 sm:w-16'>
                    <DotLottieReact
                        src='/festive/navbar.lottie'
                        loop
                        autoplay={running}
                        dotLottieRefCallback={collect}
                        speed={0.8 + (i % 3) * 0.1}
                        className='h-full w-full'
                    />
                </div>
            ))}
        </div>
    );
};

export default FestiveLights;
