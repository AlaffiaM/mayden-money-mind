


export const PAYSTACK_API = "https://api.paystack.co";

export function getPaystackKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  return key && !key.startsWith("your-") ? key : null;
}
