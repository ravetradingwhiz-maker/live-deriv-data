const mongoose = require('mongoose');

// Allow-list of admin users, keyed by their Deriv account loginid (e.g. ROT90364524, CR123456).
const AdminSchema = new mongoose.Schema(
    {
        loginid: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
        role: { type: String, enum: ['admin'], default: 'admin' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Admin', AdminSchema);
