// UTM attribution + reconciliation CSV report tests
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app, prisma, createUser, createSubscription, createPayment, login } from "./helpers.js";

describe("UTM attribution (signup tracking)", () => {
  it("stores UTM params passed at registration", async () => {
    const email = `utm-${Date.now()}@test.com`;
    const res = await request(app).post("/api/auth/register").send({
      fullName: "UTM User",
      email,
      phone: "08012345678",
      password: "StrongPass123!",
      utmSource: "mayden_website",
      utmMedium: "website_button",
      utmCampaign: "mayden_launch",
    });
    assert.equal(res.status, 201);

    const user = await prisma.user.findUnique({ where: { email } });
    assert.equal(user.utmSource, "mayden_website");
    assert.equal(user.utmMedium, "website_button");
    assert.equal(user.utmCampaign, "mayden_launch");
  });

  it("stores null UTM when none are sent", async () => {
    const email = `plain-${Date.now()}@test.com`;
    const res = await request(app).post("/api/auth/register").send({
      fullName: "Plain User",
      email,
      phone: "08098765432",
      password: "StrongPass123!",
    });
    assert.equal(res.status, 201);

    const user = await prisma.user.findUnique({ where: { email } });
    assert.equal(user.utmSource, null);
  });
});

describe("Reconciliation CSV + UTM report", () => {
  let adminToken;

  before(async () => {
    const admin = await createUser({ email: "repadmin@test.com", password: "AdminPass123!", role: "admin" });
    adminToken = await login("repadmin@test.com", "AdminPass123!");

    const user = await createUser({ email: "payer@test.com", password: "PayerPass123!" });
    const sub = await createSubscription({ userId: user.id, status: "active" });

    await createPayment({ userId: user.id, subscriptionId: sub.id, amount: 100, status: "success", reference: "REF-SUCCESS-1", paidAt: new Date() });
    await createPayment({ userId: user.id, subscriptionId: sub.id, amount: 100, status: "failed", reference: "REF-FAILED-1", paidAt: new Date() });
    await createPayment({ userId: user.id, subscriptionId: sub.id, amount: 100, status: "success", reference: "REF-OLD-1", paidAt: new Date(Date.now() - 10 * 86400000) });
  });

  it("requires admin for the CSV export", async () => {
    const res = await request(app).get("/api/admin/payments/export?days=1");
    assert.equal(res.status, 401);
  });

  it("removed the manual send-now endpoint", async () => {
    const res = await request(app)
      .post("/api/admin/reports/send-now")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(res.status, 404);
  });

  it("exports only recent successful payments as CSV", async () => {
    const res = await request(app)
      .get("/api/admin/payments/export?days=1")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(res.status, 200);
    assert.match(res.headers["content-type"], /text\/csv/);

    const lines = res.text.split("\r\n");
    assert.match(lines[0], /Transaction Date & Time/);
    const rows = lines.slice(1).filter(Boolean);
    assert.equal(rows.length, 1);
    assert.match(rows[0], /payer@test\.com/);
    assert.match(rows[0], /REF-SUCCESS-1/);
    assert.doesNotMatch(res.text, /REF-FAILED-1/);
    assert.doesNotMatch(res.text, /REF-OLD-1/);
  });

  it("reports the UTM funnel counts", async () => {
    await prisma.user.update({
      where: { email: "payer@test.com" },
      data: { utmSource: "mayden_funnel" },
    });

    const res = await request(app)
      .get("/api/admin/reports/utm")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(res.status, 200);

    const source = res.body.sources.find((s) => s.utmSource === "mayden_funnel");
    assert.ok(source, "mayden_funnel source present");
    assert.equal(source.registered, 1);
    assert.equal(source.paid, 1);
    assert.equal(source.active, 1);
  });

  it("includes previous-month payments in the monthly report window", async () => {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

    const user = await prisma.user.findUnique({ where: { email: "payer@test.com" } });
    const sub = await prisma.subscription.findFirst({ where: { userId: user.id } });
    await prisma.payment.create({
      data: {
        userId: user.id,
        subscriptionId: sub.id,
        amount: 350,
        status: "success",
        reference: "REF-MONTHLY-1",
        paidAt: new Date(lastMonthStart.getTime() + 86400000),
      },
    });

    const res = await request(app)
      .get(`/api/admin/payments/export?from=${lastMonthStart.toISOString()}&to=${monthStart.toISOString()}`)
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(res.status, 200);
    assert.match(res.text, /REF-MONTHLY-1/);
    assert.doesNotMatch(res.text, /REF-SUCCESS-1/);
  });
});
