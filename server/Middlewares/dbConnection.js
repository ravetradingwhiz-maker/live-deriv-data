const mongoose = require('mongoose');

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log('[DB] MongoDB connected'))
    .catch(err => console.error('[DB] MongoDB connection error:', err.message));

module.exports = mongoose;
