import { FRONTEND_URL } from "../config/env.js";
import logger from "../utils/logger.js";

const SENDER_NAME = "Money & Mind";
const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
const LOGO_URL = `${FRONTEND_URL}/assets/logo.jpg`;

export function brevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_FROM_EMAIL);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailTemplate({ title, bodyHtml, footerText = "Money & Mind by Mayden Microfinance Bank" }) {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f6f4ef;font-family:Georgia,'Times New Roman',serif;color:#1c1a17;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ef;padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td align="center" style="padding:8px 0 20px;">
              <img src="${LOGO_URL}" alt="Money & Mind" width="72" height="72" style="border-radius:50%;object-fit:cover;" />
              <p style="margin:10px 0 0;font-size:20px;font-weight:bold;color:#1c1a17;">Money <span style="color:#d63384;">&amp;</span> Mind</p>
              <p style="margin:2px 0 0;font-size:12px;color:#8a8a8a;">by Mayden Microfinance Bank</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #ece7df;border-radius:14px;padding:28px;">
              <h1 style="font-size:19px;margin:0 0 14px;color:#1c1a17;">${escapeHtml(title)}</h1>
              <div style="font-size:15px;line-height:1.6;color:#4a463f;white-space:pre-line;">${bodyHtml}</div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:18px 0 4px;font-size:11px;color:#a8a29b;">${escapeHtml(footerText)}</td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

// Send a formatted Brevo email
export async function sendUserEmail({ to, subject, title, body }) {
  return sendEmail({
    to,
    subject,
    htmlContent: emailTemplate({ title, bodyHtml: escapeHtml(body) }),
  });
}

// Welcome email with plan details
export async function sendWelcomeEmail({ to, fullName, plan, nextRenewal }) {
  const planLabel = plan === "weekly" ? "Weekly — ₦100 / week" : "Monthly — ₦350 / month";
  const renewalDate = new Date(nextRenewal).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const bodyHtml = `
<p>Hi ${escapeHtml(fullName)},</p>
<p>Welcome to <strong>Money &amp; Mind</strong> — we're so glad you're here. You've just given yourself a daily two-minute ritual for calm, confident money.</p>
<p>Your subscription is active:</p>
<p style="background:#faf6ef;border:1px solid #ece7df;border-radius:10px;padding:12px 16px;"><strong>${escapeHtml(planLabel)}</strong><br/>Next renewal: ${escapeHtml(renewalDate)}</p>
<p>Your daily audio is ready every morning — tap below to start listening.</p>
<p><a href="${FRONTEND_URL}/dashboard" style="display:inline-block;background:#d63384;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:9999px;font-size:14px;font-weight:bold;">Start Listening</a></p>
<p style="font-size:13px;color:#8a8a8a;">You can manage or cancel your subscription anytime from your account.</p>`;

  return sendEmail({
    to,
    subject: "Welcome to Money & Mind",
    htmlContent: emailTemplate({ title: "Welcome to Money & Mind", bodyHtml }),
  });
}

// Welcome email sent right after the user confirms their email
export async function sendAccountWelcomeEmail({ to, fullName }) {
  const bodyHtml = `
<p>Hi ${escapeHtml(fullName)},</p>
<p>You're in — your email is confirmed and your <strong>Money &amp; Mind</strong> account is ready.</p>
<p>Every morning you'll get a short, calming two-minute audio to help you think clearly and act with confidence about your money — no jargon, no stress.</p>
<p><strong>What's next:</strong></p>
<ul style="margin:0 0 16px;padding-left:20px;">
  <li>Visit the dashboard to start listening</li>
  <li>Unlock your full daily library when you subscribe — ₦100/week or ₦350/month</li>
  <li>Keep going — small steps, every single day</li>
</ul>
<p><a href="${FRONTEND_URL}/dashboard" style="display:inline-block;background:#d63384;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:9999px;font-size:14px;font-weight:bold;">Start Listening</a></p>
<p>Warmly,<br/>The Money &amp; Mind team</p>`;

  return sendEmail({
    to,
    subject: "Welcome to Money & Mind",
    htmlContent: emailTemplate({ title: "Welcome to Money & Mind", bodyHtml }),
  });
}

// Email the 30-minute verification code
export async function sendVerificationEmail({ to, fullName, code }) {
  const bodyHtml = `
<p>Hi ${escapeHtml(fullName)},</p>
<p>Welcome to <strong>Money &amp; Mind</strong> — we're glad you're here. To activate your account and unlock your daily audio, enter the 6-digit code below:</p>
<p style="background:#faf6ef;border:1px solid #ece7df;border-radius:10px;padding:16px;text-align:center;letter-spacing:8px;font-size:30px;font-weight:bold;color:#1c1a17;">${escapeHtml(code)}</p>
<p>Your code is valid for <strong>30 minutes</strong>.</p>
<p style="font-size:13px;color:#8a8a8a;">If you didn't create an account, you can safely ignore this email.</p>`;

  return sendEmail({
    to,
    subject: "Confirm your Money & Mind email",
    htmlContent: emailTemplate({ title: "Confirm your email", bodyHtml }),
  });
}

// Email the 30-minute password reset code
export async function sendPasswordResetEmail({ to, fullName, code }) {
  const bodyHtml = `
<p>Hi ${escapeHtml(fullName)},</p>
<p>We received a request to recover your <strong>Money &amp; Mind</strong> password.</p>
<p>Enter the 6-digit code below to choose a new one — it's valid for <strong>30 minutes</strong>:</p>
<p style="background:#faf6ef;border:1px solid #ece7df;border-radius:10px;padding:16px;text-align:center;letter-spacing:8px;font-size:30px;font-weight:bold;color:#1c1a17;">${escapeHtml(code)}</p>
<p style="font-size:13px;color:#8a8a8a;">If this wasn't you, you can safely ignore this email — your password stays as it is.</p>`;

  return sendEmail({
    to,
    subject: "Recover your Money & Mind password",
    htmlContent: emailTemplate({ title: "Recover your password", bodyHtml }),
  });
}

export async function sendEmail({ to, subject, textContent, htmlContent, attachment }) {
  if (!brevoConfigured()) {
    console.log("[email] skipped — set BREVO_API_KEY and BREVO_FROM_EMAIL");
    return { sent: false, reason: "brevo not configured" };
  }

  const body = {
    sender: { name: SENDER_NAME, email: process.env.BREVO_FROM_EMAIL },
    to: [{ email: to }],
    subject,
    textContent,
  };
  if (htmlContent) body.htmlContent = htmlContent;
  if (attachment) body.attachment = [attachment];

  const response = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Brevo API ${response.status}: ${errorBody.slice(0, 200)}`);
  }

  return { sent: true, via: "brevo" };
}
