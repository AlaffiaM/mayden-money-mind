// Paystack configuration — API base URL and secret-key resolution.
// The Paystack secret key is sourced ONLY from the PAYSTACK_SECRET_KEY
// environment variable. It must not be stored in or read from the database.
export const PAYSTACK_API = "https://api.paystack.co";

export function getPaystackKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  return key && !key.startsWith("your-") ? key : null;
}
