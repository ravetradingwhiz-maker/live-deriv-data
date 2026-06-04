const express = require('express');
const rateLimit = require('express-rate-limit');
const paymentController = require('../Controllers/paymentController');

const router = express.Router();

// Throttle order creation (per IP) to deter abuse of the provider API.
const createLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

router.get('/pricing', paymentController.pricing);
router.post('/create', createLimiter, paymentController.create);
router.get('/:orderId', paymentController.getOrder);

module.exports = router;
