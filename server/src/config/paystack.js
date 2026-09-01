// Paystack configuration — API base URL and secret-key resolution.
import { prisma, withRetry } from "./prisma.js";

export const PAYSTACK_API = "https://api.paystack.co";

// Reads Paystack key from DB Setting table, falls back to env var
export async function getPaystackKey() {
  const setting = await withRetry(() =>
    prisma.setting.findUnique({ where: { key: "paystackSecretKey" } })
  );
  const key = setting?.value || process.env.PAYSTACK_SECRET_KEY;
  return key && !key.startsWith("your-") ? key : null;
}
