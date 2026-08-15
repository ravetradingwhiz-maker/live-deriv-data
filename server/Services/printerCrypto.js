const crypto = require('crypto');

/**
 * Encryption for stored Deriv PATs.
 *
 * The key is derived from an existing server secret rather than a new env var,
 * so there is nothing extra to configure or rotate. Consequence worth knowing:
 * changing MONGODB_URI invalidates stored tokens, and the admin simply re-enters
 * theirs (the session keeps running until then only if it can still decrypt).
 */
const SECRET = process.env.MONGODB_URI || 'printer-local-dev-secret';
const KEY = crypto.scryptSync(SECRET, 'printer-token-v1', 32);

const encryptToken = plain => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
    const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
    // iv | authTag | ciphertext
    return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64');
};

const decryptToken = blob => {
    const buf = Buffer.from(String(blob), 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
};

module.exports = { encryptToken, decryptToken };
