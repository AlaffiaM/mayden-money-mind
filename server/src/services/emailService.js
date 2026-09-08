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
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f6f4ef;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ef;padding:28px 0;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
          <tr>
            <td align="center" style="padding:0 0 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #ece7df;border-radius:50%;">
                <tr><td style="padding:6px;">
                  <img src="${LOGO_URL}" alt="Money & Mind" width="62" height="62" style="display:block;border-radius:50%;object-fit:cover;" />
                </td></tr>
              </table>
              <p style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;color:#1a1a1a;letter-spacing:0.2px;">Money <span style="color:#EC268F;">&amp;</span> Mind</p>
              <p style="margin:2px 0 0;font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:#a8a29b;">by Mayden Microfinance Bank</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 0 14px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#FFF0F6;border:1px solid #F9C7E4;border-radius:9999px;padding:8px 26px;font-size:15px;font-weight:600;color:#1a1a1a;">${escapeHtml(title)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #eee8dd;border-radius:16px;padding:34px 38px;">
              <div style="font-size:15px;line-height:1.65;color:#4a463f;">${bodyHtml}</div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 0 8px;font-size:11px;color:#a8a29b;line-height:1.8;">
              ${escapeHtml(footerText)}<br />
              You're receiving this email because of your Money &amp; Mind account.<br />
              <span style="color:#c9c2b9;">© ${year} Mayden Microfinance Bank</span>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function ctaButton(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr>
      <td style="background:#EC268F;border-radius:9999px;">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 28px;border-radius:9999px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

function codeBox(code) {
  return `
<p style="text-align:center;margin:26px 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8a8a8a;">Your code</p>
<p style="text-align:center;margin:0 0 12px;background:#FFF0F6;border:1px dashed #EC268F;border-radius:14px;padding:16px 10px;font-size:34px;line-height:1;letter-spacing:10px;font-weight:bold;color:#1a1a1a;">${escapeHtml(code)}</p>
<p style="text-align:center;margin:0 0 6px;font-size:12px;color:#8a8a8a;">Valid for 30 minutes</p>`;
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
<p style="text-align:center;background:#faf6ef;border:1px solid #ece7df;border-radius:10px;padding:12px 16px;"><strong>${escapeHtml(planLabel)}</strong><br/>Next renewal: ${escapeHtml(renewalDate)}</p>
<p>Your daily audio is ready every morning.</p>
<p style="text-align:center;">${ctaButton(`${FRONTEND_URL}/dashboard`, "Start Listening")}</p>
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
<p style="text-align:center;">${ctaButton(`${FRONTEND_URL}/dashboard`, "Start Listening")}</p>
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
${codeBox(code)}
<p style="font-size:13px;color:#8a8a8a;">If you didn't create an account, you can safely ignore this email.</p>`;

  return sendEmail({
    to,
    subject: "Confirm your Money & Mind email",
    htmlContent: emailTemplate({ title: "Confirm your email", bodyHtml }),
  });
}

// Email a one-time nudge to users whose subscription has lapsed
export async function sendSubscriptionReminderEmail({ to, fullName }) {
  const bodyHtml = `
<p>Hi ${escapeHtml(fullName)},</p>
<p>Your <strong>Money &amp; Mind</strong> subscription has ended — but your library is still here.</p>
<p>Every episode you've listened to is waiting for you. Renew to pick up right where you left off and keep your morning moment of calm.</p>
<p style="text-align:center;">${ctaButton(`${FRONTEND_URL}/subscription`, "Restore Access")}</p>
<p>Warmly,<br/>The Money &amp; Mind team</p>`;

  return sendEmail({
    to,
    subject: "Your Money & Mind subscription has ended",
    htmlContent: emailTemplate({ title: "Your subscription has ended", bodyHtml }),
  });
}

// Email the 30-minute password reset code
export async function sendPasswordResetEmail({ to, fullName, code }) {
  const bodyHtml = `
<p>Hi ${escapeHtml(fullName)},</p>
<p>We received a request to recover your <strong>Money &amp; Mind</strong> password. Use the code below to choose a new one:</p>
${codeBox(code)}
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
