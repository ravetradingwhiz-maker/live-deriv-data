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

module.exports = { createPaymentSchema, paystackInitSchema };
