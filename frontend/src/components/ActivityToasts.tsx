import { useCallback, useEffect, useRef, useState } from 'react';
import { Quote, Sparkles, TrendingUp, X } from 'lucide-react';
import { ACTIVITY, type Activity, type ActivityKind } from '@/data/activity';

/**
 * A single quiet notice in the corner, one at a time.
 *
 * Tuned so it does not read as a carousel. Three things do that:
 *
 *  - **It is mostly absent.** Seven seconds on screen against a gap of half a
 *    minute or more, so the eye meets it as an event rather than as a widget
 *    that lives there.
 *  - **The gap is never the same twice.** A fixed interval is the thing that
 *    gives a rotation away — you start expecting the next one. The wait is
 *    drawn fresh each time.
 *  - **The order is shuffled, not cyclic**, and reshuffled each time the list
 *    is exhausted, with the seam guarded so the same line never lands twice in
 *    a row. A visitor would have to stay several minutes to see a repeat, and
 *    it would not be in the same place in the sequence.
 *
 * It also holds while the tab is in the background, so coming back to the page
 * does not trigger a burst of queued notices.
 */

/** How long before the first one — a moment to take the page in. */
const FIRST_DELAY_MS = 5_000;
/** How long each stays up. Slow enough to read twice. */
const VISIBLE_MS = 5_000;
/**
 * The gap between them, drawn fresh from this range each time.
 *
 * Sized so one lands about every 15 seconds: 5s on screen, 0.7s to fade, then
 * this. Still a range and not a fixed number — an interval you can predict is
 * the thing that makes a rotation obvious, however short it is.
 */
const GAP_MIN_MS = 7_000;
const GAP_MAX_MS = 12_000;
/** Matches the CSS transition, so the next one never overlaps the exit. */
const FADE_MS = 700;

/**
 * Each kind carries its own mark and its own lit border, so the sort of notice
 * it is registers before any of it has been read.
 */
const KINDS: Record<ActivityKind, { icon: typeof TrendingUp; tone: string; edge: string }> = {
    profit: {
        icon: TrendingUp,
        tone: 'text-emerald-400',
        edge: 'border-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.28)]',
    },
    purchase: {
        icon: Sparkles,
        tone: 'text-cyan-400',
        edge: 'border-cyan-500/70 shadow-[0_0_20px_rgba(34,211,238,0.28)]',
    },
    testimonial: {
        icon: Quote,
        tone: 'text-violet-400',
        edge: 'border-violet-500/70 shadow-[0_0_20px_rgba(167,139,250,0.28)]',
    },
};

/**
 * How many recent lines are held back when the shuffle is refilled, which sets
 * the closest two identical lines can ever land: one more than this.
 */
const MEMORY = Math.min(3, Math.max(1, ACTIVITY.length - 1));

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

/** Fisher-Yates, on a copy. */
const shuffled = <T,>(items: T[]): T[] => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
};

const ActivityToasts = () => {
    const [current, setCurrent] = useState<Activity | null>(null);
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    /* The remaining shuffle, plus the few most recently shown.
       Inside a pass nothing repeats at all. The memory exists for the seam
       between one shuffle and the next, which is the only place the same line
       can land close enough to be noticed. */
    const queueRef = useRef<Activity[]>([]);
    const recentRef = useRef<Activity[]>([]);

    const nextActivity = useCallback((): Activity => {
        if (queueRef.current.length === 0) {
            const recent = recentRef.current;
            const refill = shuffled(ACTIVITY);

            /* Items come off the END of the queue, so it is the TAIL of the
               refill that lands next to what was just shown — not its head.
               Any clash there is swapped out with something from the head,
               rather than reshuffling until the tail happens to be clean: a
               retry loop needs a cap, and a cap is a rare pass that fails the
               very thing it exists to guarantee. A swapped-in item cannot
               clash, and the one swapped out is now in `recent`, so the guard
               below skips it as a destination. */
            const head = refill.length - recent.length;
            for (let i = head; i < refill.length; i++) {
                if (i < 0 || !recent.includes(refill[i])) continue;
                for (let j = 0; j < head; j++) {
                    if (recent.includes(refill[j])) continue;
                    [refill[i], refill[j]] = [refill[j], refill[i]];
                    break;
                }
            }

            queueRef.current = refill;
        }

        const item = queueRef.current.pop() as Activity;
        recentRef.current = [...recentRef.current, item].slice(-MEMORY);
        return item;
    }, []);

    useEffect(() => {
        if (dismissed) return;

        let cancelled = false;
        let timer = 0;

        const later = (ms: number, run: () => void) => {
            timer = window.setTimeout(() => {
                if (!cancelled) run();
            }, ms);
        };

        const show = () => {
            // A background tab would otherwise burn through the list unseen and
            // have several waiting the moment it is focused again.
            if (document.hidden) {
                later(5_000, show);
                return;
            }
            setCurrent(nextActivity());
            setVisible(true);
            later(VISIBLE_MS, hide);
        };

        const hide = () => {
            setVisible(false);
            later(FADE_MS + randomBetween(GAP_MIN_MS, GAP_MAX_MS), show);
        };

        later(FIRST_DELAY_MS, show);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [dismissed, nextActivity]);

    if (dismissed || !current) return null;

    const { icon: Icon, tone, edge } = KINDS[current.kind];

    return (
        <div
            // `polite` and not `alert`: it is ambient, and should wait for a
            // screen reader to finish what it is already saying.
            role='status'
            aria-live='polite'
            /* Top right, clear of everything fixed to the top of the app shell.
               The bottom of a phone screen belongs to the tab bar and the
               positions handle sitting on it, so the top is the only free
               corner.

               The offsets are the two bars it has to sit under, measured:
                 · phone  — the 64px header alone, so `top-20` (80px).
                 · md+    — the header plus the desktop tab bar, which is 58px
                            of its own (36px links + 2px borders + 20px padding)
                            and ends at 122px. `md:top-36` (144px) clears it.
               `md:right-14` rather than `right-4`, because the positions drawer
               keeps a 36px strip down the right edge even when closed.

               z-30 rather than z-20: the tab bar is z-30 and sticky, and this
               renders after it, so ties go to the toast. The panel itself
               (z-40), the header (z-40) and the phone tab bar (z-50) all still
               cover it, which is right — it is ambient, and must never sit over
               something the user actually opened. */
            className={`fixed left-4 right-4 top-20 z-30 flex items-start gap-3 rounded-xl border bg-ink-800/95 p-3 pr-9 backdrop-blur transition-all ease-out sm:left-auto sm:right-4 md:right-14 md:top-36 md:max-w-sm ${edge} ${
                visible
                    ? 'translate-y-0 opacity-100'
                    : 'pointer-events-none -translate-y-2 opacity-0 motion-reduce:translate-y-0'
            }`}
            style={{ transitionDuration: `${FADE_MS}ms` }}
        >
            <span className={`mt-0.5 shrink-0 ${tone}`}>
                <Icon size={16} />
            </span>

            <div className='min-w-0'>
                {current.kind === 'testimonial' ? (
                    /* Named entities rather than the literal “ ” characters: the
                       direction is then stated in ASCII and cannot be flipped or
                       mangled by a file saved in the wrong encoding. */
                    <p className='text-xs leading-relaxed text-slate-300'>
                        &ldquo;{current.text}&rdquo;
                    </p>
                ) : (
                    <p className='text-xs leading-relaxed text-slate-300'>
                        <span className='font-semibold text-white'>{current.who}</span> {current.text}
                    </p>
                )}
                {/* Only a quote needs attributing underneath. The other kinds
                    already open with the name, so a second line would repeat it. */}
                {current.kind === 'testimonial' && (
                    <p className='mt-1 text-[10px] text-slate-500'>{current.who}</p>
                )}
            </div>

            <button
                type='button'
                onClick={() => setDismissed(true)}
                aria-label='Dismiss'
                className='absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-ink-700 hover:text-white'
            >
                <X size={13} />
            </button>
        </div>
    );
};

export default ActivityToasts;
