const express = require('express');
const rateLimit = require('express-rate-limit');
const paymentController = require('../Controllers/paymentController');

const router = express.Router();

// Throttle order creation (per IP) to deter abuse of the provider API.
const createLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

router.get('/pricing', paymentController.pricing);
router.post('/create', createLimiter, paymentController.create);
// Card (Paystack): start a hosted checkout + receive charge webhooks.
router.post('/paystack/init', createLimiter, paymentController.createCard);
// M-Pesa (Paystack mobile money, KES): shares the same webhook/verify path.
router.post('/mpesa/init', createLimiter, paymentController.createMpesa);
router.post('/paystack/webhook', paymentController.webhook);
router.get('/:orderId', paymentController.getOrder);

module.exports = router;
