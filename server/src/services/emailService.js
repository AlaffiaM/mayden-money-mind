// Shared transactional email service — the single Brevo path for the app.
// Used by password-reset emails and payment reconciliation. No-op (with a log)
// when Brevo isn't configured so local dev works without keys.
const SENDER_NAME = "Money & Mind";
const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

export function brevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_FROM_EMAIL);
}

// Sends a transactional email via the Brevo SMTP API.
// `to` is a single email address (string). Optional `attachment`:
// { name, content } where content is base64. Resolves with { sent, via, reason }.
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
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Brevo API ${response.status}: ${errorBody.slice(0, 200)}`);
  }

  return { sent: true, via: "brevo" };
}
