const Joi = require('joi');

const createPaymentSchema = Joi.object({
    tier: Joi.string().valid('alpha', 'quantum', 'apex').required(),
    payCurrency: Joi.string().valid('usdt').required(),
    email: Joi.string().email().required(),
    // Deriv login ids on the account (real + demo). At least one required.
    loginids: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
});

// Card (Paystack) checkout — same as above minus the crypto pay-currency.
const paystackInitSchema = Joi.object({
    tier: Joi.string().valid('alpha', 'quantum', 'apex').required(),
    email: Joi.string().email().required(),
    loginids: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
});

/**
 * M-Pesa (PayHero) checkout.
 *
 * Carries a phone number where the card flow does not: Paystack put up a hosted
 * page that asked for it, while PayHero pushes the STK prompt straight from the
 * server, so the number has to come in with the request. Kept loose here —
 * digits, spaces, `+` and the country code are all accepted — because
 * `payHeroService.normalisePhone` is the one place that decides what a Kenyan
 * number looks like, and two opinions about that would eventually disagree.
 */
const mpesaInitSchema = Joi.object({
    tier: Joi.string().valid('alpha', 'quantum', 'apex').required(),
    email: Joi.string().email().required(),
    loginids: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
    phone: Joi.string()
        .trim()
        .pattern(/^[\d+\s()-]{9,17}$/)
        .required()
        .messages({ 'string.pattern.base': 'Enter a valid Safaricom number, e.g. 0712345678' }),
});

module.exports = { createPaymentSchema, paystackInitSchema, mpesaInitSchema };
