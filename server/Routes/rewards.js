const express = require('express');
const rateLimit = require('express-rate-limit');
const rewardController = require('../Controllers/rewardController');

const router = express.Router();

/* Tighter than the subscription check: each call opens a socket to Deriv and
   walks a profit table, so it costs far more than a database lookup. */
const checkLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

router.post('/growth/check', checkLimiter, rewardController.check);
router.post('/growth/claim', checkLimiter, rewardController.claim);

module.exports = router;
