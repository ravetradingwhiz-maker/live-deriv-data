import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useFestivePlayback, usePlayers } from '@/hooks/useFestivePerf';

/**
 * Wreaths hung on the top corners of the Nexora card.
 *
 * They sit outside the card's own box so they can overhang its edge — the
 * card is `overflow-hidden` for the candles behind it, and anything placed
 * inside would be cut off at the border. Overhanging is the point: a wreath
 * flush inside a corner reads as printed on the card, one that breaks the
 * edge reads as hung on it.
 *
 * Each is offset by half its own width, so the corner of the card passes
 * through the middle of the wreath — hung on the corner rather than next to
 * it. Smaller on a phone, where the card runs nearly edge to edge.
 */
const CORNERS = [
    { key: 'left', className: '-left-8 -top-8 sm:-left-12 sm:-top-12 lg:-left-14 lg:-top-14' },
    { key: 'right', className: '-right-8 -top-8 sm:-right-12 sm:-top-12 lg:-right-14 lg:-top-14' },
];

/* The single wreath sits inside the card's right edge rather than past it.
   Hanging off the corner works on the marketing hero, which has room either
   side; on an app card it pushed into whatever was beside it. It still
   overhangs the top, which is what makes it read as hung rather than
   printed. */
const SINGLE = [{ key: 'single', className: 'right-1 -top-7 sm:right-3 sm:-top-9 lg:right-4 lg:-top-10' }];

interface Props {
    /** Which flag shows these — the home page's or the app's. */
    scope?: 'home' | 'app';
    /** `one` hangs a single wreath on the top-right, for a card that only
     *  needs marking rather than framing. */
    corners?: 'both' | 'one';
}

const FestiveWreaths = ({ scope = 'home', corners = 'both' }: Props) => {
    const running = useFestivePlayback();
    const collect = usePlayers(running);

    return (
        <div
            aria-hidden='true'
            className={`pointer-events-none ${scope === 'app' ? 'festive-app-only' : 'festive-only'}`}
        >
            {(corners === 'one' ? SINGLE : CORNERS).map((corner, i) => (
                <div
                    key={corner.key}
                    className={`absolute z-10 h-16 w-16 sm:h-24 sm:w-24 lg:h-28 lg:w-28 ${corner.className}`}
                >
                    <DotLottieReact
                        src='/festive/christmas-wreath.json'
                        loop
                        autoplay={running}
                        /* Offset, so the pair does not pulse in lockstep and
                           read as one object mirrored. */
                        speed={i === 0 ? 1 : 0.85}
                        dotLottieRefCallback={collect}
                        className='h-full w-full'
                    />
                </div>
            ))}
        </div>
    );
};

export default FestiveWreaths;
