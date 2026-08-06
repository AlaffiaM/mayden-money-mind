// Paystack payment integration — initialize transactions and verify payments
// Falls back to dev mode (always succeeds) when PAYSTACK_SECRET_KEY is not set
import { prisma } from "../config/prisma.js";
import { PAYSTACK_API, getPaystackKey } from "../config/paystack.js";
import { generateReference } from "../utils/helpers.js";

// Dev-mode bypass is ONLY allowed outside production. In production a missing
// Paystack key is a hard error — silently "succeeding" would let users in free.
function assertPaystackConfigured() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Paystack secret key is not configured");
  }
}

// Initializes a Paystack transaction — returns reference + redirect URL for user checkout
export async function initializePayment(user, subscriptionId, amount) {
  const reference = generateReference();
  const amountInKobo = amount * 100;
  const secret = await getPaystackKey();

  // Dev mode bypass: no Paystack key configured, return dummy reference
  if (!secret) {
    assertPaystackConfigured();
    return { reference, redirectUrl: null };
  }

  const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      amount: amountInKobo,
      reference,
      channels: ["card", "bank", "bank_transfer", "ussd"],
      callback_url: `${(process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "")}/subscription?reference=${reference}`,
    }),
  });

  const data = await response.json();

  if (!data.status) {
    throw new Error(data.message || "Paystack initialization failed");
  }

  return { reference, redirectUrl: data.data.authorization_url };
}

// Verifies a payment reference with Paystack — returns true if payment succeeded
export async function verifyPayment(reference) {
  const secret = await getPaystackKey();

  // Dev mode bypass: always returns true
  if (!secret) {
    assertPaystackConfigured();
    return true;
  }

  const response = await fetch(`${PAYSTACK_API}/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  const data = await response.json();
  return data.status && data.data.status === "success";
}
