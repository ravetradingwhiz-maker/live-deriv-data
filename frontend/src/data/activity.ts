/**
 * The lines the activity toasts rotate through.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PLACEHOLDER COPY. Replace before this goes in front of real traders.
 *
 * Every line here is an assertion about a real person: that they made a figure,
 * bought a tier, or said a sentence. On a site where people decide whether to
 * risk money, inventing those is not marketing polish — it is a fabricated
 * record, and testimonials in particular are regulated as such in most places
 * this will be read.
 *
 * Three rules for anything added here:
 *
 *  - **Nothing about withdrawals.** The platform does not do them, and a notice
 *    claiming otherwise promises something nobody can deliver. Profit lines are
 *    about what a session made, not about money leaving.
 *  - **Keep the names spread across the places people actually log in from.** A
 *    single-origin list reads as a demographic guess rather than a user base.
 *  - **No straight apostrophes.** These are single-quoted strings; write around
 *    the contraction rather than escaping it.
 *
 * The rotation works with any list, so swapping these for real results and
 * quotes you have permission to print needs nothing but an edit to this file.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type ActivityKind = 'profit' | 'purchase' | 'testimonial';

export interface Activity {
    kind: ActivityKind;
    /** Who it is attributed to. */
    who: string;
    /** The line itself — a sentence continuing from `who`, or a quote. */
    text: string;
}

export const ACTIVITY: Activity[] = [
    // ── Kenya ───────────────────────────────────────────────────────────────
    { kind: 'profit', who: 'Grace Wanjiku', text: 'finished a Nexora AI session up $142.60' },
    {
        kind: 'testimonial',
        who: 'Faith Chebet',
        text: 'Smart AI picks the market itself. I stopped second guessing which index to sit on.',
    },
    { kind: 'purchase', who: 'Hope Njeri', text: 'started a Nexora AI Free session' },
    { kind: 'profit', who: 'Mercy Achieng', text: 'ran Smart AI to a $210.00 profit this week' },
    { kind: 'purchase', who: 'Brian Kamau', text: 'upgraded to Nexora AI Premium' },
    { kind: 'profit', who: 'Joy Nyambura', text: 'made $64.40 on Volatility 100 (1s)' },
    { kind: 'purchase', who: 'Kevin Omondi', text: 'connected a real Deriv account' },
    { kind: 'profit', who: 'Isaac Kipkemboi', text: 'hit a $50 profit target in 20 minutes' },
    {
        kind: 'testimonial',
        who: 'Alice Muthoni',
        text: 'Smart AI runs the recovery leg on its own. One less thing for me to get wrong at 1am.',
    },

    // ── Nigeria ─────────────────────────────────────────────────────────────
    { kind: 'purchase', who: 'Victor Adeyemi', text: 'subscribed to Nexora AI Premium' },
    {
        kind: 'testimonial',
        who: 'Blessing Okafor',
        text: 'Running Smart AI on the 1s markets while I work. I check the panel at lunch and that is enough.',
    },
    { kind: 'profit', who: 'Samuel Balogun', text: 'finished a Smart AI run up $73.90' },
    { kind: 'purchase', who: 'Deborah Nwosu', text: 'switched on Smart AI for the first time' },
    { kind: 'profit', who: 'Chioma Eze', text: 'let Smart AI run for an hour and came back to $96.30' },

    // ── Colombia ────────────────────────────────────────────────────────────
    { kind: 'profit', who: 'Camila Restrepo', text: 'ran a session to $118.40 in profit' },
    {
        kind: 'testimonial',
        who: 'Santiago Herrera',
        text: 'The Under 8 and Over 1 rotation is the part I would never have had the patience for.',
    },
    { kind: 'purchase', who: 'Valentina Ortiz', text: 'moved up to Nexora AI Premium' },
    { kind: 'profit', who: 'Mateo Salazar', text: 'closed out $95.20 ahead on Volatility 75 (1s)' },
    { kind: 'purchase', who: 'Andres Vargas', text: 'set Smart AI running on the 1s markets' },

    // ── Malaysia ────────────────────────────────────────────────────────────
    { kind: 'purchase', who: 'Farah Zainal', text: 'linked a real Deriv account' },
    {
        kind: 'testimonial',
        who: 'Jason Lim',
        text: 'Losing rounds still happen. The difference is I know exactly what Smart AI did and why.',
    },
    { kind: 'profit', who: 'Aisyah Rahman', text: 'reached a $40 target before lunch' },
    { kind: 'purchase', who: 'Wei Ming Tan', text: 'joined the Telegram channel' },
    { kind: 'profit', who: 'Hafiz Ismail', text: 'finished a Smart AI run up $58.70' },

    // ── Elsewhere ───────────────────────────────────────────────────────────
    { kind: 'purchase', who: 'James Mark', text: 'unlocked Nexora AI Premium' },
    { kind: 'profit', who: 'Daniel Cole', text: 'closed the day up $88.15' },
    {
        kind: 'testimonial',
        who: 'Sarah Bennett',
        text: 'The run panel showing every contract is what sold me. No guessing what it did overnight.',
    },
    {
        kind: 'testimonial',
        who: 'Michael Reed',
        text: 'Smart AI switching sides on its own beats me watching digits for an hour.',
    },
    {
        kind: 'testimonial',
        who: 'Laura Stone',
        text: 'Signals in the channel and the bot in one place. I stopped switching between apps.',
    },
    { kind: 'purchase', who: 'Peter Hughes', text: 'joined the Telegram community' },
];
