import { useEffect, useRef, useState } from 'react';

/**
 * What the festive scene is allowed to cost.
 *
 * Every Lottie is its own canvas repainting on every frame, so the scene's
 * price is the number of them — not their file size, which the browser
 * caches after the first copy. Three decisions keep it affordable:
 *
 *  - fewer of them on a small screen, where there is less room and less CPU
 *  - none of them running once the hero has scrolled away
 *  - none of them running at all for someone who asked for less movement
 */

/** True once the viewport is at least `px` wide, and kept true-to-size. */
export const useWideEnough = (px: number): boolean => {
    const [wide, setWide] = useState(() =>
        typeof window === 'undefined' ? true : window.matchMedia(`(min-width: ${px}px)`).matches
    );

    useEffect(() => {
        const mq = window.matchMedia(`(min-width: ${px}px)`);
        const onChange = (e: MediaQueryListEvent) => setWide(e.matches);
        mq.addEventListener('change', onChange);
        setWide(mq.matches);
        return () => mq.removeEventListener('change', onChange);
    }, [px]);

    return wide;
};

/** Whether this visitor has asked for less movement. */
export const useReducedMotion = (): boolean => {
    const [reduced, setReduced] = useState(() =>
        typeof window === 'undefined' ? false : window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
        mq.addEventListener('change', onChange);
        setReduced(mq.matches);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    return reduced;
};

/**
 * Whether the element is anywhere near the viewport.
 *
 * The hero is at the top of the page, so everything in it keeps painting
 * while someone reads the rest of the site — for nothing. A generous margin
 * means it is already running again before it comes back into view.
 */
export const useNearViewport = <T extends HTMLElement>(): [React.RefObject<T>, boolean] => {
    const ref = useRef<T>(null);
    const [near, setNear] = useState(true);

    useEffect(() => {
        const node = ref.current;
        if (!node || typeof IntersectionObserver === 'undefined') return;

        const observer = new IntersectionObserver(entries => setNear(entries[0]?.isIntersecting ?? true), {
            rootMargin: '200px',
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    return [ref, near];
};

/**
 * Whether the festive animations should be running at all.
 *
 * Three reasons to stop, and all of them are free to check:
 *
 *  - the tab is in the background, where nothing is watching
 *  - the page has been scrolled a screen past the hero, where nothing is
 *    visible but the sticky header's ornaments, and a still ornament is
 *    indistinguishable from a moving one you are not looking at
 *  - the visitor asked for less movement
 *
 * Scroll position rather than an observer, because the ornaments live in the
 * header, which is sticky and therefore always "in view" — the question is
 * not whether they are on screen but whether anyone is still at the top of
 * the page looking at them.
 */
export const useFestivePlayback = (): boolean => {
    const reduced = useReducedMotion();
    const [awake, setAwake] = useState(true);

    useEffect(() => {
        let frame = 0;

        const settle = () => {
            frame = 0;
            const nearTop = window.scrollY < window.innerHeight;
            setAwake(!document.hidden && nearTop);
        };

        /* Coalesced into a frame: a scroll handler that runs on every event
           is the thing it is supposed to be saving. */
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(settle);
        };

        settle();
        window.addEventListener('scroll', onScroll, { passive: true });
        document.addEventListener('visibilitychange', settle);
        return () => {
            if (frame) cancelAnimationFrame(frame);
            window.removeEventListener('scroll', onScroll);
            document.removeEventListener('visibilitychange', settle);
        };
    }, []);

    return awake && !reduced;
};

/**
 * Collects Lottie players and starts or stops them together.
 *
 * Deduplicated on the way in: the ref callback fires again on re-render, and
 * an array that only ever grows is a leak with a slow fuse.
 */
export const usePlayers = (running: boolean) => {
    const players = useRef<{ play: () => void; pause: () => void }[]>([]);

    useEffect(() => {
        for (const player of players.current) {
            if (running) player.play();
            else player.pause();
        }
    }, [running]);

    return (player: { play: () => void; pause: () => void } | null) => {
        if (player && !players.current.includes(player)) players.current.push(player);
    };
};
