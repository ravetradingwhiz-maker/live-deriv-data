/**
 * One gate in front of a block explorer's HTTP API.
 *
 * Every pending order on a chain shares the same deposit address, so asking
 * "what has arrived here?" once per order asks the same question many times
 * over. The sweep walks up to fifty of them in a row every thirty seconds,
 * which on a free explorer tier — a few calls a second — answers itself with
 * "rate limit reached" and settles nothing.
 *
 * The gate collapses that into one question: callers asking at the same moment
 * share a single request, an answer is served again for a few seconds, the
 * requests that do go out are spaced, and a rate limit is retried rather than
 * handed back as a failure.
 */

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Keys are deposit addresses, so there are only ever a handful. This is a
 *  guard against a leak, not a working limit. */
const MAX_KEYS = 50;

const createGate = ({
    /** Minimum spacing between requests that actually go out. */
    minGapMs = 400,
    /** How long an answer stands in for the next caller asking the same thing. */
    cacheMs = 10000,
    /** Extra attempts after a rate limit, which is a wait rather than an error. */
    retries = 1,
    retryDelayMs = 800,
    isRateLimit = () => false,
} = {}) => {
    const cache = new Map();
    const inflight = new Map();
    let chain = Promise.resolve();
    let lastAt = 0;

    /* A single queue, so two callers that miss the cache at the same moment
       still leave minGapMs apart rather than together. */
    const spaced = fn => {
        const turn = chain.then(async () => {
            const wait = lastAt + minGapMs - Date.now();
            if (wait > 0) await sleep(wait);
            lastAt = Date.now();
            return fn();
        });
        // The queue has to survive a failure, or one error stops every call behind it.
        chain = turn.then(
            () => {},
            () => {}
        );
        return turn;
    };

    const prune = () => {
        if (cache.size <= MAX_KEYS) return;
        const now = Date.now();
        for (const [key, entry] of cache) if (now - entry.at >= cacheMs) cache.delete(key);
    };

    const run = (key, fn) => {
        const hit = cache.get(key);
        if (hit && Date.now() - hit.at < cacheMs) return Promise.resolve(hit.value);

        // Already being asked: wait for that answer instead of asking again.
        const pending = inflight.get(key);
        if (pending) return pending;

        const attempt = (async () => {
            let lastError;
            for (let tries = 0; tries <= retries; tries += 1) {
                try {
                    const value = await spaced(fn);
                    cache.set(key, { at: Date.now(), value });
                    prune();
                    return value;
                } catch (error) {
                    lastError = error;
                    // Anything but a rate limit is a real failure; don't hammer it.
                    if (tries === retries || !isRateLimit(error)) break;
                    await sleep(retryDelayMs);
                }
            }
            throw lastError;
        })().finally(() => inflight.delete(key));

        inflight.set(key, attempt);
        return attempt;
    };

    /** Drops everything held. For tests, which stub a different answer per case. */
    const reset = () => {
        cache.clear();
        inflight.clear();
        lastAt = 0;
    };

    return { run, reset };
};

module.exports = { createGate };
