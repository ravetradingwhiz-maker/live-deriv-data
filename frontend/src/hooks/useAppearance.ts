import { useEffect } from 'react';

/**
 * How the app looks, decided by an admin and read by everyone.
 *
 * The flag lives on the server rather than in the build, so turning a theme
 * on is a switch rather than a deploy — and turning it off again is too,
 * which matters more: a seasonal theme that needs a release to remove is
 * still on the site in March.
 *
 * It paints by putting a class on `<html>`, beside the `dark`/`light` the
 * theme toggle already sets, so every festive rule is one CSS selector away
 * from the colours it has to coexist with.
 */
const ENDPOINT = `${(process.env.API_URL || '').replace(/\/$/, '')}/api/settings/appearance`;

/** The class each flag adds. Nothing else here knows these names. */
const CLASSES: Record<string, string> = {
    christmas: 'festive',
};

/**
 * Reads the flags once, on load.
 *
 * Deliberately not polled: a theme changing under a visitor mid-session is
 * stranger than one that waits for their next visit, and this is a request
 * every single page load would otherwise repeat.
 */
export const useAppearance = (): void => {
    useEffect(() => {
        let cancelled = false;

        fetch(ENDPOINT)
            .then(r => (r.ok ? r.json() : null))
            .then((flags: Record<string, boolean> | null) => {
                if (cancelled || !flags) return;
                for (const [flag, className] of Object.entries(CLASSES)) {
                    document.documentElement.classList.toggle(className, Boolean(flags[flag]));
                }
            })
            .catch(() => {
                /* Unreachable server means the plain app, which is the right
                   failure: a theme is the least important thing on the page. */
            });

        return () => {
            cancelled = true;
        };
    }, []);
};

export default useAppearance;
