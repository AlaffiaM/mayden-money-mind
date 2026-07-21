// Paystack payment integration — initialize transactions and verify payments
// Falls back to dev mode (always succeeds) when PAYSTACK_SECRET_KEY is not set
import { PrismaClient } from "@prisma/client";
import { generateReference } from "../utils/helpers.js";

const prisma = new PrismaClient();
const PAYSTACK_API = "https://api.paystack.co";

// Reads Paystack key from DB Setting table, falls back to env var
async function getPaystackKey() {
  const setting = await prisma.setting.findUnique({ where: { key: "paystackSecretKey" } });
  const key = setting?.value || process.env.PAYSTACK_SECRET_KEY;
  return key && !key.startsWith("your-") ? key : null;
}

// Initializes a Paystack transaction — returns reference + redirect URL for user checkout
export async function initializePayment(user, subscriptionId, amount) {
  const reference = generateReference();
  const amountInKobo = amount * 100;
  const secret = await getPaystackKey();

  // Dev mode bypass: no Paystack key configured, return dummy reference
  if (!secret) {
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
      callback_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/subscription?reference=${reference}`,
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
    return true;
  }

  const response = await fetch(`${PAYSTACK_API}/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  const data = await response.json();
  return data.status && data.data.status === "success";
}
