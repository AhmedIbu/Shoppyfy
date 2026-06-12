import { Resend } from 'resend';
import { env } from './env';

const client = env.resend.apiKey ? new Resend(env.resend.apiKey) : null;
const FROM = env.resend.from;
const SITE = 'SEMMAI';
const BASE = env.clientUrl;

export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  if (!client) {
    console.log(`[email] No RESEND_API_KEY — would send "${subject}" to ${to}`);
    return;
  }
  try {
    await client.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error('[email] Send failed:', (err as Error).message);
  }
};

const shell = (body: string) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#f5f5f0;font-family:'Helvetica Neue',Arial,sans-serif;color:#1c1b1f}
  .wrap{max-width:560px;margin:40px auto;background:#fff;border:1px solid #ddd}
  .hdr{background:#1c1b1f;padding:28px 40px}
  .hdr h1{color:#fff;font-size:26px;letter-spacing:-0.5px;font-weight:700}
  .bdy{padding:40px}
  h2{font-size:20px;margin-bottom:16px;font-weight:700}
  p{line-height:1.6;margin-bottom:14px;color:#3c3c3c;font-size:15px}
  .btn{display:inline-block;background:#3525cd;color:#fff!important;text-decoration:none;
       padding:14px 32px;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:20px 0}
  .items{border-top:1px solid #eee;margin:20px 0;padding-top:16px}
  .item{padding:8px 0;border-bottom:1px solid #eee;font-size:14px;color:#3c3c3c}
  .ftr{padding:20px 40px;border-top:1px solid #eee;font-size:12px;color:#888}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr"><h1>${SITE}</h1></div>
  <div class="bdy">${body}</div>
  <div class="ftr">© ${new Date().getFullYear()} ${SITE}. All rights reserved.<br>
    <span style="color:#aaa;font-size:11px">Note: with Resend's test sender (onboarding@resend.dev) emails only deliver to the account owner's verified address. Add a custom domain in Resend to send to all users.</span>
  </div>
</div>
</body></html>`;

export const emails = {
  passwordReset: (link: string) =>
    shell(`
      <h2>Reset your password</h2>
      <p>We received a request to reset the password for your ${SITE} account.</p>
      <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
      <a class="btn" href="${link}">Reset Password</a>
      <p style="font-size:13px;color:#888">If you didn't request this, you can safely ignore this email — your password won't change.</p>
    `),

  orderConfirmed: (orderNumber: string, itemLines: string, total: string) =>
    shell(`
      <h2>Order confirmed — #${orderNumber}</h2>
      <p>Thank you for your purchase. We're preparing your editorial selections with care.</p>
      <div class="items">${itemLines}</div>
      <p><strong>Order total: ${total}</strong></p>
      <a class="btn" href="${BASE}/orders">View Order</a>
      <p>We'll send you another email when your order ships.</p>
    `),

  orderShipped: (orderNumber: string, trackingNumber?: string | null, carrier?: string | null) =>
    shell(`
      <h2>Your order has shipped</h2>
      <p>Order <strong>#${orderNumber}</strong> is on its way, picked up by ${carrier ?? 'our carrier partner'}.</p>
      ${trackingNumber ? `<p><strong>Tracking number:</strong> ${trackingNumber}</p>` : ''}
      <a class="btn" href="${BASE}/orders">Track Order</a>
    `),

  orderDelivered: (orderNumber: string) =>
    shell(`
      <h2>Your order has arrived</h2>
      <p>Order <strong>#${orderNumber}</strong> has been delivered. We hope you love your new pieces.</p>
      <a class="btn" href="${BASE}/shop">Shop Again</a>
    `),

  newsletterWelcome: () =>
    shell(`
      <h2>You're in the inner circle.</h2>
      <p>Welcome to ${SITE}. You'll be the first to know about editorial drops, exclusive designer collaborations, and member-only pricing.</p>
      <a class="btn" href="${BASE}/shop">Explore the Collection</a>
      <p style="font-size:13px;color:#888">You can unsubscribe at any time by replying to this email.</p>
    `),
};
