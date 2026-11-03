const mongoose = require('mongoose');

/**
 * What a customer has chosen to be called.
 *
 * `loginids` holds every Deriv login on the account, matching `Subscription`
 * and `GrowthReward`, so the name follows the customer rather than whichever
 * account they happened to be signed in to — and, unlike the browser storage
 * this replaced, follows them to a new device.
 *
 * No `default` on anything that is read back. A default is evaluated on every
 * hydration of a document that lacks the field, so a row written before a
 * field existed silently reports a fresh value on each call.
 */
const ProfileSchema = new mongoose.Schema(
    {
        loginids: { type: [String], required: true, index: true },
        nickname: { type: String, trim: true, maxlength: 20 },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Profile', ProfileSchema);
