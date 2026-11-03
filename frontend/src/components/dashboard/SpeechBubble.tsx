import type { ReactNode } from 'react';

/**
 * A cartoon speech balloon: an oval with a tapering spike.
 *
 * The oval is a real ellipse (`border-radius: 50%`) rather than a rounded
 * rectangle, so it keeps its shape at any text length. The spike is a separate
 * fixed-size SVG, so it never stretches with the balloon the way a single
 * scaled path would.
 *
 * It is anchored at the oval's vertical middle on purpose: that is the one
 * height where the ellipse's edge touches its bounding box, so the spike meets
 * the balloon cleanly instead of leaving a sliver of a gap against the curve.
 */
const SpeechBubble = ({ children }: { children: ReactNode }) => (
    <div className='relative'>
        <div className='rounded-[50%] bg-bubble px-5 py-5 text-center shadow-lg shadow-black/40 sm:px-7'>
            {children}
        </div>

        <svg
            viewBox='0 0 26 28'
            aria-hidden
            className='absolute left-[-19px] top-1/2 h-7 w-[26px] -translate-y-1/2 fill-bubble'
        >
            <path d='M26,2 C17,8 9,15 0,26 C11,17 17,12 26,16 Z' />
        </svg>
    </div>
);

export default SpeechBubble;
