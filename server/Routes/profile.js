const express = require('express');
const rateLimit = require('express-rate-limit');
const profileController = require('../Controllers/profileController');

const router = express.Router();

const readLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
/* Each write costs a Deriv round-trip to prove ownership, so it is held well
   below the read limit. */
const writeLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

router.get('/', readLimiter, profileController.get);
router.post('/nickname', writeLimiter, profileController.setNickname);

module.exports = router;
