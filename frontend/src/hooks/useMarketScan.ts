import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The market scan that runs before the bot does.
 *
 * Pressing Run opens the scan and holds it for SCAN_MS, and only then starts
 * the bot. Nothing trades while it is up, which is the point: gating the modal
 * on the bot's own status instead meant the first trades were placed behind it,
 * and the bot drops back to "scanning" between every trade, so the modal also
 * kept returning mid-session.
 *
 * Owning the delay rather than reacting to status is what makes both problems
 * go away — the scan is a fixed opening act, and the bot starts when it ends.
 */

/** How long the scan runs before the bot is started. */
const SCAN_MS = 5000;

interface MarketScan {
    /** Whether the scan is on screen. */
    scanning: boolean;
    /** Call in place of the bot's own start — scans first, then starts it. */
    beginScan: () => void;
}

export const useMarketScan = (start: () => void): MarketScan => {
    const [scanning, setScanning] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    /* The caller passes a fresh closure on most renders, so the timer reads it
       from here rather than capturing whichever one was current when it was set. */
    const startRef = useRef(start);
    startRef.current = start;

    const clear = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
    }, []);

    const beginScan = useCallback(() => {
        // Ignore a second press while one is already running.
        if (timerRef.current) return;
        setScanning(true);
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            setScanning(false);
            startRef.current();
        }, SCAN_MS);
    }, []);

    // Leaving the screen mid-scan must not start a bot onto a page that has gone.
    useEffect(() => clear, [clear]);

    return { scanning, beginScan };
};

export default useMarketScan;
