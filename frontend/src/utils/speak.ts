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
 * Says `text` once in a female voice where the device has one.
 *
 * Returns a cancel function. Speech must begin inside the user gesture that
 * triggered it or mobile browsers drop it, so this speaks immediately when the
 * voice list is already populated and only waits for `voiceschanged` when it
 * is not — that list is empty on the first call in most browsers, which is the
 * usual reason speech silently does nothing.
 */
export const speak = (text: string): (() => void) => {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    if (!synth) return () => {};

    let cancelled = false;

    const say = () => {
        if (cancelled) return;
        // Clear anything queued, so a quick second run does not stack up.
        synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = pickFemaleVoice(synth.getVoices());
        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
        }
        synth.speak(utterance);
    };

    if (synth.getVoices().length) say();
    else synth.addEventListener('voiceschanged', say, { once: true });

    return () => {
        cancelled = true;
        synth.removeEventListener('voiceschanged', say);
        synth.cancel();
    };
};

export default speak;
