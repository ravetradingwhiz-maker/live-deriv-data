/**
 * Spoken lines, via the browser's own voices.
 *
 * No asset and no network: the previous scan sound was hotlinked from a
 * third-party site, which went silent offline and broke if that URL ever moved.
 */

/**
 * Voice names that are female on the platforms this app runs on.
 *
 * `SpeechSynthesisVoice` exposes no gender, so matching the name is the only
 * way to ask for one. Samantha is Apple's, Zira and Hazel are Microsoft's, and
 * Google's are labelled outright.
 */
const FEMALE_NAMES = [
    'female',
    'samantha',
    'karen',
    'moira',
    'tessa',
    'victoria',
    'fiona',
    'serena',
    'allison',
    'ava',
    'susan',
    'zira',
    'hazel',
    'catherine',
    'linda',
    'heather',
    'amy',
    'emma',
];

const pickFemaleVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
    // English first, so a device defaulting to another language does not read
    // an English line with that language's phonetics.
    const english = voices.filter(v => /^en(-|$)/i.test(v.lang));
    const pool = english.length ? english : voices;
    const female = pool.find(v => FEMALE_NAMES.some(name => v.name.toLowerCase().includes(name)));
    // No female voice installed: better to speak in whatever there is than to
    // say nothing at all.
    return female ?? pool[0] ?? null;
};

/**
 * How long to wait for the voice list before speaking without it.
 *
 * The list is empty until the browser has loaded it, and `voiceschanged` is
 * the event that says it has — but several browsers never fire it at all, and
 * one that waits for it is simply silent. Long enough for the list to arrive
 * on a browser that does fire it, short enough that the line still lands
 * inside the moment it belongs to.
 */
const VOICE_WAIT_MS = 250;

/**
 * Says `text` once in a female voice where the device has one.
 *
 * Returns a cancel function. Speech must begin inside the user gesture that
 * triggered it or mobile browsers drop it, so this speaks immediately when the
 * voice list is already populated, and otherwise races the list against a short
 * timer rather than waiting on it indefinitely.
 */
export const speak = (text: string): (() => void) => {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    if (!synth) return () => {};

    let cancelled = false;
    let queued = false;
    let started = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const say = () => {
        if (cancelled || queued) return;
        queued = true;
        if (timer) clearTimeout(timer);
        synth.removeEventListener('voiceschanged', say);

        /* Chrome leaves synthesis paused after its tab has been in the
           background, and a paused queue swallows everything handed to it
           without complaining. Resuming one that is not paused does nothing,
           so this costs nothing to call every time. */
        synth.resume();
        /* Only when there is something to clear. cancel() followed in the same
           breath by speak() is a known way to lose the utterance outright, and
           most calls here have nothing queued behind them to clear. */
        if (synth.speaking || synth.pending) synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const voice = pickFemaleVoice(synth.getVoices());
        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
        }
        utterance.onstart = () => {
            started = true;
        };
        synth.speak(utterance);
    };

    if (synth.getVoices().length) say();
    else {
        synth.addEventListener('voiceschanged', say, { once: true });
        timer = setTimeout(say, VOICE_WAIT_MS);
    }

    return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
        synth.removeEventListener('voiceschanged', say);
        /* A line already being spoken is left to finish: the scan closing after
           two and a half seconds is not a reason to cut a sentence in half, and
           cancelling then is how a line that started late was lost. Only one
           queued and not yet started is dropped. */
        if (queued && !started) synth.cancel();
    };
};

export default speak;
