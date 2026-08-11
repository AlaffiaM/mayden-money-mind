// Paystack payment integration — initialize transactions, verify payments,
// and manage recurring billing via Paystack Plans & Subscriptions.
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

async function getSetting(key) {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value || null;
}

async function setSetting(key, value) {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

// Paystack Setting keys that cache the plan codes for each subscription tier
const PLAN_SETTING_BY_PLAN = {
  weekly: "paystackPlanWeekly",
  monthly: "paystackPlanMonthly",
};

// Creates the Weekly and Monthly Paystack Plans (idempotent) and caches their
// plan codes in the Setting table. Returns { weekly, monthly } plan codes or
// null in dev mode. Plan amounts follow the current weeklyPrice/monthlyPrice.
export async function ensurePlans() {
  const secret = await getPaystackKey();
  if (!secret) return null;

  const priceSettings = await prisma.setting.findMany({
    where: { key: { in: ["weeklyPrice", "monthlyPrice"] } },
  });
  const priceMap = {};
  for (const s of priceSettings) priceMap[s.key] = s.value;

  const plans = [
    { plan: "weekly", name: "Money & Mind Weekly", interval: "weekly", amount: parseInt(priceMap.weeklyPrice || "100", 10) },
    { plan: "monthly", name: "Money & Mind Monthly", interval: "monthly", amount: parseInt(priceMap.monthlyPrice || "350", 10) },
  ];

  const codes = {};
  for (const plan of plans) {
    const settingKey = PLAN_SETTING_BY_PLAN[plan.plan];
    let code = await getSetting(settingKey);
    if (code) {
      codes[plan.plan] = code;
      continue;
    }

    const response = await fetch(`${PAYSTACK_API}/plan`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: plan.name,
        amount: plan.amount * 100,
        interval: plan.interval,
        currency: "NGN",
      }),
    });

    const data = await response.json();
    if (data.status && data.data?.plan_code) {
      code = data.data.plan_code;
      await setSetting(settingKey, code);
      codes[plan.plan] = code;
    } else {
      throw new Error(data.message || "Failed to create Paystack plan");
    }
  }

  return codes;
}

// All supported Paystack payment channels. Recurring subscriptions are only
// possible with card, so channel choice is deferred to checkout — the saved
// authorization is enrolled in a subscription after payment if it's a card.
const ALL_CHANNELS = ["card", "bank", "bank_transfer", "ussd", "qr", "mobile_money", "eft"];

// Initializes a Paystack transaction — returns reference + redirect URL for user checkout.
// No plan is attached at initialize time so every payment channel stays available;
// recurring billing (only possible for cards) is enrolled after payment via
// createPaystackSubscription. Pass forceCard for flows that must use the saved card.
export async function initializePayment(user, subscriptionId, amount, subPlan, { forceCard = false } = {}) {
  const reference = generateReference();
  const amountInKobo = amount * 100;
  const secret = await getPaystackKey();

  // Dev mode bypass: no Paystack key configured, return dummy reference
  if (!secret) {
    assertPaystackConfigured();
    return { reference, redirectUrl: null };
  }

  const body = {
    email: user.email,
    amount: amountInKobo,
    reference,
    channels: forceCard ? ["card"] : ALL_CHANNELS,
    callback_url: `${(process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "")}/subscription?reference=${reference}`,
  };

  const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!data.status) {
    throw new Error(data.message || "Paystack initialization failed");
  }

  return { reference, redirectUrl: data.data.authorization_url };
}

// Verifies a payment reference with Paystack — returns the verified transaction
// data (with subscription_code / plan / authorization for recurring setup) or
// null if the payment did not succeed. Dev mode returns `true`.
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
  if (data.status && data.data.status === "success") return data.data;
  return null;
}

// Enrolls a customer in a recurring Paystack subscription (invoice_limit 0 = renew
// forever, card charged each interval). Only works with reusable card authorizations.
// No-op in dev mode or when Paystack is not configured.
export async function createPaystackSubscription({ customer, plan, authorization, invoiceLimit = 0 }) {
  const secret = await getPaystackKey();
  if (!secret || !customer || !plan || !authorization) return null;

  const response = await fetch(`${PAYSTACK_API}/subscription`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ customer, plan, authorization, invoice_limit: invoiceLimit }),
  });

  const data = await response.json();
  if (!data.status) {
    throw new Error(data.message || "Failed to create Paystack subscription");
  }
  return data.data;
}

// Stops future recurring charges for a Paystack subscription (no email_token needed).
// No-op in dev mode or when the subscription was never linked to Paystack.
export async function disablePaystackSubscription(subscriptionCode) {
  const secret = await getPaystackKey();
  if (!secret || !subscriptionCode) return null;

  const response = await fetch(`${PAYSTACK_API}/subscription/${subscriptionCode}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${secret}` },
  });

  const data = await response.json();
  if (!data.status) {
    throw new Error(data.message || "Failed to disable Paystack subscription");
  }
  return data;
}
