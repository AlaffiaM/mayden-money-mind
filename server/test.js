import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:5000';

async function main() {
  try {
    // 1. Create a test user
    const email = `test_${Date.now()}@example.com`;
    const password = 'TestPass123!';
    const fullName = 'Test User';
    const phone = '08012345678';

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

    // 2. Create a subscription for this user (one-time, no autoRenew)
    const sub = await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: 'weekly',
        status: 'active',
        autoRenew: false,
        paystackSubscriptionCode: null,
        paystackPlanCode: null,
        nextRenewal: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
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

    // 4. Attempt to cancel the subscription (should fail with 400)
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

    // 6. Now test with an autoRenew subscription (create another)
    const sub2 = await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: 'monthly',
        status: 'active',
        autoRenew: true,
        paystackSubscriptionCode: 'sub_test_123', // dummy
        paystackPlanCode: 'plan_test_123',
        nextRenewal: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`Created autoRenew subscription: ${sub2.id}`);

    // 7. Cancel this one (should succeed)
    const cancelRes2 = await fetch(`${BASE_URL}/api/subscriptions/${sub2.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    console.log(`Cancel autoRenew response status: ${cancelRes2.status}`);
    const cancelBody2 = await cancelRes2.text();
    console.log(`Cancel autoRenew response body: ${cancelBody2}`);

    const sub2After = await prisma.subscription.findUnique({ where: { id: sub2.id } });
    console.log(`AutoRenew subscription after cancel: status=${sub2After.status} autoRenew=${sub2After.autoRenew} paystackSubscriptionCode=${sub2After.paystackSubscriptionCode}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();