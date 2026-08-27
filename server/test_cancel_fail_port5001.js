import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:5001';

async function main() {
  try {
    // 1. Create a test user
    const email = `testfail5001_${Date.now()}@example.com`;
    const password = 'TestPass123!';
    const fullName = 'Test User Fail 5001';
    const phone = `080${Date.now() % 1000000000}`;

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        phone,
        passwordHash,
      },
    });
    console.log(`Created user: ${user.id} ${user.email}`);

    // 2. Create an auto-renew subscription with dummy paystackSubscriptionCode
    const sub = await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: 'weekly',
        status: 'active',
        autoRenew: true,
        paystackSubscriptionCode: 'sub_dummy_invalid', // will cause Paystack API to fail
        paystackPlanCode: 'plan_dummy',
        nextRenewal: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`Created subscription: ${sub.id} autoRenew=${sub.autoRenew} paystackSubscriptionCode=${sub.paystackSubscriptionCode}`);

    // 3. Login to get JWT token
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status}`);
    }
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log(`Obtained token`);

    // 4. Attempt to cancel the subscription (should fail with 502 due to Paystack error)
    const cancelRes = await fetch(`${BASE_URL}/api/subscriptions/${sub.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    console.log(`Cancel response status: ${cancelRes.status}`);
    const cancelBody = await cancelRes.text();
    console.log(`Cancel response body: ${cancelBody}`);

    // 5. Check subscription status in DB after attempt
    const subAfter = await prisma.subscription.findUnique({ where: { id: sub.id } });
    console.log(`Subscription after cancel attempt: status=${subAfter.status} autoRenew=${subAfter.autoRenew} paystackSubscriptionCode=${subAfter.paystackSubscriptionCode}`);

    // Assertions
    if (cancelRes.status !== 502) {
      throw new Error(`Expected status 502 but got ${cancelRes.status}`);
    }
    if (subAfter.status !== 'active' || subAfter.autoRenew !== true) {
      throw new Error(`Subscription should remain active and autoRenew true, got status=${subAfter.status} autoRenew=${subAfter.autoRenew}`);
    }
    console.log('✅ Test passed: cancel failed with 502 and subscription unchanged');
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();