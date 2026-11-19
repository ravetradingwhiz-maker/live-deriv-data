const crypto = require('crypto');

/**
 * A shared secret in front of the admin routes that no browser calls.
 *
 * These endpoints had nothing in front of them: `POST /api/admin` writes the
 * admin allow-list, and that list is what switches admin mode on across the
 * bots and the clones, so an unauthenticated write to it was the worst door
 * in the building.
 *
 * It guards only the routes driven by hand (Postman, curl). The rest of the
 * admin router is called by the admin UI in a browser, which sends no
 * credential at all — putting this in front of those would either break the
 * UI or force the secret into the frontend bundle, where anyone could read
 * it. Those need real admin sign-in, not a shared secret.
 *
 * Fails closed: with no `ADMIN_API_TOKEN` set, the routes answer 503 rather
 * than falling open. Nothing a customer touches depends on them.
 */
const HEADER = 'x-admin-token';

/**
 * Constant-time compare. `timingSafeEqual` throws on a length mismatch, so
 * the lengths are checked first — that leaks the length of the secret and
 * nothing else.
 */
const sameSecret = (supplied, expected) => {
    const a = Buffer.from(String(supplied));
    const b = Buffer.from(String(expected));
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
};

const requireAdminToken = (req, res, next) => {
    const expected = process.env.ADMIN_API_TOKEN;
    if (!expected) {
        return res
            .status(503)
            .json({ success: false, message: 'Admin API is not configured.' });
    }

    const header = req.get(HEADER);
    const bearer = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const supplied = header || bearer;

    if (!supplied || !sameSecret(supplied, expected)) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    return next();
};

module.exports = { requireAdminToken, ADMIN_TOKEN_HEADER: HEADER };
