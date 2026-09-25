import { useEffect, useRef, useState } from 'react';
import type { BotStatus } from '@/hooks/useNexoraBot';

/**
 * When to show the market scan.
 *
 * Once per session, at the start. The bot drops back to `running` after every
 * trade settles while it looks for the next signal, so keying the modal
 * straight off that status put it back over the screen between every trade —
 * which is what this hook exists to prevent.
 *
 * It clears when the first trade is placed, but never before MIN_VISIBLE_MS:
 * the bot can find a signal almost immediately, and a scan that flashes up and
 * vanishes reads as a glitch rather than as work being done.
 */

/** The floor. A scan shorter than this is not worth showing. */
const MIN_VISIBLE_MS = 5000;

export const useMarketScan = (isRunning: boolean, status: BotStatus): boolean => {
    const [visible, setVisible] = useState(false);
    /** Whether this run has already had its scan. Reset when the bot stops. */
    const spentRef = useRef(false);
    const openedAtRef = useRef(0);

    useEffect(() => {
        if (isRunning) {
            if (spentRef.current) return;
            spentRef.current = true;
            openedAtRef.current = Date.now();
            setVisible(true);
            return;
        }
        // Stopped: hide it, and arm the next run for its own scan.
        spentRef.current = false;
        setVisible(false);
    }, [isRunning]);

    useEffect(() => {
        if (!visible || status.kind !== 'trading') return;
        // Trading has started. Hold the rest of the floor, if any is left.
        const remaining = MIN_VISIBLE_MS - (Date.now() - openedAtRef.current);
        if (remaining <= 0) {
            setVisible(false);
            return;
        }
        const timer = setTimeout(() => setVisible(false), remaining);
        return () => clearTimeout(timer);
    }, [visible, status.kind]);

    return visible;
};

export default useMarketScan;
