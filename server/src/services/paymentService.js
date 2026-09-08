


import { prisma } from "../config/prisma.js";
import { PAYSTACK_API, getPaystackKey } from "../config/paystack.js";
import { generateReference } from "../utils/helpers.js";



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


const PLAN_SETTING_BY_PLAN = {
  weekly: "paystackPlanWeekly",
  monthly: "paystackPlanMonthly",
};




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




const ALL_CHANNELS = ["card", "bank", "bank_transfer", "ussd", "qr", "mobile_money", "eft"];





export async function initializePayment(user, subscriptionId, amount, subPlan, { forceCard = false } = {}) {
  const reference = generateReference();
  const amountInKobo = amount * 100;
  const secret = await getPaystackKey();

  
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




export async function verifyPayment(reference) {
  const secret = await getPaystackKey();

  
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
