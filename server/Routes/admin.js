const express = require('express');
const rateLimit = require('express-rate-limit');
const adminController = require('../Controllers/adminController');

const router = express.Router();

const checkLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
const markupLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

// The frontend checks the logged-in account loginid(s).
router.get('/check', checkLimiter, adminController.check);

// Admin management — use from Postman.  POST/DELETE body: { "loginid": "ROT90364524" }
router.get('/list', adminController.list);
router.post('/', adminController.add);
router.delete('/', adminController.remove);

// Subscriptions CRUD
router.get('/subscriptions', adminController.listSubscriptions);
router.post('/subscriptions', adminController.createSubscription);
router.patch('/subscriptions/:id', adminController.updateSubscription);
router.delete('/subscriptions/:id', adminController.deleteSubscription);

// Payments (read-only)
router.get('/payments', adminController.listPayments);

// Markup (Deriv v4 REST proxy)
router.get('/markup', markupLimiter, adminController.markup);

// Pricing
router.get('/pricing', adminController.getPricing);
router.put('/pricing', adminController.setPricing);

module.exports = router;
