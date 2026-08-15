const express = require('express');
const rateLimit = require('express-rate-limit');
const printerController = require('../Controllers/printerController');

const router = express.Router();

// Token-bearing endpoints are the sensitive ones — throttle them harder than reads.
const tokenLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const readLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });

// All routes are admin-gated inside the controller (allow-list lookup per request).
router.post('/accounts', tokenLimiter, printerController.accounts);
router.post('/start', tokenLimiter, printerController.start);
router.post('/stop', readLimiter, printerController.stop);
router.delete('/token', tokenLimiter, printerController.removeToken);
router.get('/status', readLimiter, printerController.status);

module.exports = router;
