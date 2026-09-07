// One-off rebuild of customer accounts + payments from Paystack into the new
// Supabase database (replaces data lost when the Render Postgres expired).
// Run with: node prisma/rebuildFromPaystack.js   (requires DATABASE_URL=Supabase)
import { prisma } from "../src/config/prisma.js";
import bcrypt from "bcryptjs";

const secret = process.env.PAYSTACK_SECRET_KEY;
if (!secret) throw new Error("PAYSTACK_SECRET_KEY required");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");

// Successful Paystack transactions (source of truth from Paystack API).
// reference, amount(currency units -> kobo), transaction_date, customer
const SUCCESS_REFS = [
  "MNDM-1788217858735-WA6LQH", // 350 NGN  monthly  steverichhy8@gail.com      2026-08-31
  "MNDM-1786046730574-9NAF0Y", // 100 NGN  weekly   bodiworks@gmail.com (TALABI) 2026-08-06
  "MNDM-1786028373050-3PK9HM", // 100 NGN  weekly   agbajestephen5@gmail.com    2026-08-06
  "MNDM-1784189314634-W7O792", // 100 NGN  weekly   agbajestephen5@gmail.com    2026-07-16
  "MNDM-1784187537251-O8T3SJ", // 100 NGN  weekly   agbajeolawumi5@gmail.com    2026-07-16
  "MNDM-1784053198560-JSY3DV", // 100 NGN  weekly   sagbaje7@gmail.com          2026-07-14
];

const PW_MS = 7 * 24 * 3600 * 1000;
const MO_MS = 30 * 24 * 3600 * 1000;

async function main() {
  const transactions = [];
  for (const ref of SUCCESS_REFS) {
    const resp = await fetch(`https://api.paystack.co/transaction/verify/${ref}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await resp.json();
    if (!body.status) throw new Error(`Verify ${ref} failed: ${body.message}`);
    transactions.push(body.data);
  }

  // Group by customer email, newest first — one subscription per customer.
  const byEmail = new Map();
  for (const t of transactions) {
    const email = t.customer?.email;
    if (!email) continue;
    if (!byEmail.has(email) || new Date(t.transaction_date) > new Date(byEmail.get(email).transaction_date)) {
      byEmail.set(email, t);
    }
  }

  console.log(`Reconstructing ${byEmail.size} customers from ${transactions.length} successful transactions\n`);

  for (const [email, latest] of byEmail) {
    const userTxs = transactions
      .filter((t) => t.customer?.email === email)
      .sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

    const amountKobo = latest.amount;
    const latestDate = new Date(latest.transaction_date);
    const plan = amountKobo === 35000 ? "monthly" : "weekly";
    const periodMs = plan === "monthly" ? MO_MS : PW_MS;

    const firstPaidAt = new Date(userTxs[0].transaction_date);
    const fullName =
      `${latest.customer?.first_name || ""} ${latest.customer?.last_name || ""}`.trim() ||
      "Money & Mind member";

    // Unusable placeholder hash — the customer reclaims the account via Forgot Password.
    const placeholder = await bcrypt.hash(`reset-required-${email}-${Date.now()}`, 10);

    let user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      console.log(`+ user exists, kept: ${email}`);
    } else {
      user = await prisma.user.create({
        data: {
          fullName,
          email,
          passwordHash: placeholder,
          role: "user",
          emailVerified: null, // unverified self-serve so login triggers verify/reset flows
          createdAt: firstPaidAt,
        },
      });
      console.log(`+ user created: ${email} (${fullName})`);
    }

    let subscription = await prisma.subscription.findFirst({
      where: { userId: user.id },
      orderBy: { startDate: "desc" },
    });
    if (!subscription) {
      const nextRenewal = new Date(latestDate.getTime() + periodMs);
      subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          plan,
          status: nextRenewal >= new Date() ? "active" : "expired",
          startDate: firstPaidAt,
          nextRenewal,
          autoRenew: false, // paid by bank transfer / not reusable card
        },
      });
      console.log(`  + subscription: ${plan} from ${firstPaidAt.toISOString().slice(0, 10)} -> ${nextRenewal.toISOString().slice(0, 10)} [${subscription.status}]`);
    } else {
      console.log(`  + subscription exists, kept id=${subscription.id}`);
    }

    for (const t of userTxs) {
      const existing = await prisma.payment.findUnique({ where: { reference: t.reference } });
      if (existing) continue;
      await prisma.payment.create({
        data: {
          userId: user.id,
          subscriptionId: subscription.id,
          amount: t.amount / 100,
          currency: t.currency || "NGN",
          status: "success",
          reference: t.reference,
          last4: t.authorization?.last4 || null,
          usesCard: t.authorization?.channel === "card",
          paidAt: new Date(t.transaction_date),
          createdAt: new Date(t.transaction_date),
        },
      });
      console.log(`  + payment: ${t.reference} ${t.amount / 100} ${t.currency} ${t.transaction_date}`);
    }
    console.log("");
  }

  console.log("Rebuild complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());