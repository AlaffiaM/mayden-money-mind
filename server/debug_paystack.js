import { disablePaystackSubscription } from './src/services/paymentService.js';
import { getPaystackKey } from './src/config/paystack.js';

(async () => {
  const key = await getPaystackKey();
  console.log('PAYSTACK_SECRET_KEY from env:', process.env.PAYSTACK_SECRET_KEY);
  console.log('getPaystackKey returns:', key);
  try {
    const result = await disablePaystackSubscription('sub_dummy_invalid');
    console.log('Result:', result);
  } catch (err) {
    console.error('Error from disablePaystackSubscription:', err);
  }
})();