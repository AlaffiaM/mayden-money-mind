import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <div className="min-h-screen bg-white px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="text-sm text-mayden-magenta hover:underline mb-8 inline-block">&larr; Back to Home</Link>
        <h1 className="text-3xl font-serif font-bold text-mayden-dark mb-6">Terms & Conditions</h1>
        <div className="prose prose-sm text-gray-600 leading-relaxed space-y-4">
          <p>Effective Date: January 1, 2026</p>
          <h2 className="text-lg font-semibold text-mayden-dark">1. Acceptance of Terms</h2>
          <p>By subscribing to Money & Mind by Mayden Microfinance Bank ("the Service"), you agree to be bound by these Terms and Conditions.</p>
          <h2 className="text-lg font-semibold text-mayden-dark">2. Subscription & Billing</h2>
          <p>Subscriptions are billed weekly or monthly at the price shown when you subscribe. Available payment methods include card, bank transfer, and USSD. Only eligible card payments can be set up for automatic renewal; other payment methods require a manual renewal.</p>
          <p>If an administrator changes a plan price, active subscribers will receive an in-app notice and subscribers with automatic renewal will also receive an email. The updated price applies to their next renewal. Turning off automatic renewal stops future charges, while access continues through the paid period.</p>
          <p>Turning automatic renewal back on requires a new card payment at the current plan price. That payment renews the current billing period and sets up automatic card renewals going forward.</p>
          <h2 className="text-lg font-semibold text-mayden-dark">3. Content Usage</h2>
          <p>All audio content, show notes, and related materials are proprietary to Mayden Microfinance Bank and Alaffia Media Ltd. Content is licensed for personal, non-commercial use only.</p>
          <h2 className="text-lg font-semibold text-mayden-dark">4. Cancellation & Refunds</h2>
          <p>You may turn off automatic renewal at any time from your subscription settings. Your access continues through the end of the current billing period, and no further renewal is charged. No partial refunds are provided for a period already paid.</p>
          <h2 className="text-lg font-semibold text-mayden-dark">5. Limitation of Liability</h2>
          <p>The Service is provided for educational and motivational purposes only and does not constitute financial advice. Mayden Microfinance Bank is not liable for decisions made based on content provided through the Service.</p>
        </div>
      </div>
    </div>
  );
}
