const express = require('express');
const rateLimit = require('express-rate-limit');
const settingsController = require('../Controllers/settingsController');

const router = express.Router();

/* Read on every page load by every visitor, so it is cached hard at the edge
   of what is reasonable and limited generously. */
const limiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });

// GET /api/settings/appearance — public: how the app should look right now.
router.get('/appearance', limiter, settingsController.getAppearance);

module.exports = router;
