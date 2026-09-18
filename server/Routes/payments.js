const express = require('express');
const rateLimit = require('express-rate-limit');
const paymentController = require('../Controllers/paymentController');

const router = express.Router();

// Throttle order creation (per IP) to deter abuse of the provider API.
const createLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

router.get('/pricing', paymentController.pricing);
// Must stay above the '/:orderId' catch-all below.
router.get('/methods', paymentController.methods);
router.post('/create', createLimiter, paymentController.create);
// Card (Paystack): start a hosted checkout + receive charge webhooks.
router.post('/paystack/init', createLimiter, paymentController.createCard);
// M-Pesa (PayHero STK push, KES). The prompt goes straight to the handset, so
// there is no hosted page and no redirect — the checkout polls /:orderId.
router.post('/mpesa/init', createLimiter, paymentController.createMpesa);
router.post('/paystack/webhook', paymentController.webhook);
// PayHero posts the STK result here. Unsigned, so it only ever prompts a
// server-side status check — see Services/payHeroService.js.
router.post('/payhero/callback', paymentController.payHeroCallback);
router.get('/:orderId', paymentController.getOrder);

module.exports = router;
