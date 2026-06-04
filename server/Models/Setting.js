const mongoose = require('mongoose');

// Generic key/value store for admin-editable settings (e.g. key 'pricing').
const SettingSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true, index: true },
        value: { type: mongoose.Schema.Types.Mixed },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Setting', SettingSchema);
