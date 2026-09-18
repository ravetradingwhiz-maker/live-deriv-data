const brevo = require('@getbrevo/brevo');
const { TIERS } = require('../config/tiers');

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY || '');

const fmtDate = d =>
    new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

/** Sends the subscription receipt / activation email via Brevo. */
const sendSubscriptionReceipt = async ({ email, tier, expiresAt, priceUSD, payCurrency, orderId }) => {
    if (!process.env.BREVO_API_KEY) {
        console.warn('[email] BREVO_API_KEY not set — skipping receipt email');
        return;
    }
    const label = TIERS[tier]?.label || tier;
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = `✅ Your Nexora AI ${label} subscription is active`;
    sendSmtpEmail.to = [{ email }];
    sendSmtpEmail.sender = { name: process.env.SENDER_NAME || 'Nexora AI', email: process.env.SENDER_EMAIL };
    sendSmtpEmail.htmlContent = `
    <div style="max-width:600px;margin:auto;font-family:Arial,sans-serif;background:#0b1418;color:#e2e8f0;padding:28px;border-radius:12px;border:1px solid #1e2a30;">
      <h2 style="margin:0 0 4px;background:linear-gradient(90deg,#fbbf24,#a855f7);-webkit-background-clip:text;background-clip:text;color:transparent;">Nexora AI ${label}</h2>
      <p style="color:#94a3b8;margin-top:0;">Your premium subscription is now active.</p>
      <div style="background:#0f1c22;border:1px solid #1e2a30;border-radius:10px;padding:16px;margin:18px 0;">
        <p style="margin:6px 0;"><strong>Plan:</strong> ${label}</p>
        <p style="margin:6px 0;"><strong>Paid:</strong> ${priceUSD} USD (${payCurrency.toUpperCase()})</p>
        <p style="margin:6px 0;"><strong>Active until:</strong> ${fmtDate(expiresAt)}</p>
        <p style="margin:6px 0;"><strong>Order:</strong> ${orderId}</p>
      </div>
      <p style="color:#94a3b8;">Premium is unlocked for all logins on your account — just log in and open Nexora AI Premium.</p>
      <hr style="border:none;border-top:1px solid #1e2a30;margin:24px 0;">
      <p style="color:#64748b;font-size:12px;">© ${new Date().getFullYear()} Nexora AI. Need help? Reply to this email.</p>
    </div>`;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
};

/** Where sale notifications go. */
const ADMIN_EMAIL = 'ryanshalo4@gmail.com';

/**
 * Tells the admin a payment landed.
 *
 * Deliberately plain text and detailed rather than styled: it is read on a
 * phone notification, and the useful version answers "who, how much, how" from
 * the preview line alone. The receipt number is here because it is the only
 * thing that ties an order back to the provider when something is queried.
 */
const sendAdminSaleAlert = async ({ tier, priceUSD, payCurrency, payAmount, orderId, email, loginids, provider, receipt }) => {
    if (!process.env.BREVO_API_KEY) {
        console.warn('[email] BREVO_API_KEY not set — skipping admin alert');
        return;
    }
    const label = TIERS[tier]?.label || tier;
    const charged = payAmount ? `${payAmount} ${String(payCurrency).toUpperCase()}` : `${priceUSD} USD`;

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = `💰 ${label} sold — ${priceUSD} USD (${provider})`;
    sendSmtpEmail.to = [{ email: ADMIN_EMAIL }];
    sendSmtpEmail.sender = { name: process.env.SENDER_NAME || 'Nexora AI', email: process.env.SENDER_EMAIL };
    sendSmtpEmail.htmlContent = `
    <div style="max-width:560px;margin:auto;font-family:Arial,sans-serif;color:#0f172a;">
      <h2 style="margin:0 0 12px;">${label} — ${priceUSD} USD</h2>
      <table cellpadding="6" style="border-collapse:collapse;font-size:14px;">
        <tr><td style="color:#64748b;">Charged</td><td><strong>${charged}</strong></td></tr>
        <tr><td style="color:#64748b;">Method</td><td>${provider}</td></tr>
        <tr><td style="color:#64748b;">Receipt</td><td>${receipt || '—'}</td></tr>
        <tr><td style="color:#64748b;">Customer</td><td>${email}</td></tr>
        <tr><td style="color:#64748b;">Logins</td><td>${(loginids || []).join(', ') || '—'}</td></tr>
        <tr><td style="color:#64748b;">Order</td><td>${orderId}</td></tr>
        <tr><td style="color:#64748b;">Time</td><td>${new Date().toISOString()}</td></tr>
      </table>
    </div>`;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
};

module.exports = { sendSubscriptionReceipt, sendAdminSaleAlert };
