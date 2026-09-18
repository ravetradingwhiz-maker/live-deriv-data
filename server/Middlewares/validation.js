const Joi = require('joi');
const { TIERS } = require('../config/tiers');

/**
 * Every sellable tier, read from the one table that defines them.
 *
 * Includes `quantumsyn`, which live-deriv's own checkout never offers. That is
 * a front-of-house decision, not a security boundary: there is one API behind
 * both sites, and buying `quantumsyn` here buys QuantumSyn access, which
 * live-deriv will never honour — see `product` in config/tiers.js. Nothing is
 * gained by refusing it and a drifting hand-written list is easy to get wrong.
 */
const TIER_IDS = Object.keys(TIERS);

const createPaymentSchema = Joi.object({
    tier: Joi.string()
        .valid(...TIER_IDS)
        .required(),
    payCurrency: Joi.string().valid('usdt').required(),
    email: Joi.string().email().required(),
    // Deriv login ids on the account (real + demo). At least one required.
    loginids: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
});

// Card (Paystack) checkout — same as above minus the crypto pay-currency.
const paystackInitSchema = Joi.object({
    tier: Joi.string()
        .valid(...TIER_IDS)
        .required(),
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
    tier: Joi.string()
        .valid(...TIER_IDS)
        .required(),
    email: Joi.string().email().required(),
    loginids: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
    phone: Joi.string()
        .trim()
        .pattern(/^[\d+\s()-]{9,17}$/)
        .required()
        .messages({ 'string.pattern.base': 'Enter a valid Safaricom number, e.g. 0712345678' }),
});

module.exports = { createPaymentSchema, paystackInitSchema, mpesaInitSchema };
