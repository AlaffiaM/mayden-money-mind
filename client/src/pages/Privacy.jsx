import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="text-sm text-mayden-magenta hover:underline mb-8 inline-block">&larr; Back to Home</Link>
        <h1 className="text-3xl font-serif font-bold text-mayden-dark mb-6">Privacy Policy</h1>
        <div className="prose prose-sm text-gray-600 leading-relaxed space-y-4">
          <p>Effective Date: January 1, 2026</p>
          <p>This Privacy Policy explains how Mayden Microfinance Bank ("we", "us") handles personal information when you use Money & Mind. It is intended to describe the service's current practices.</p>
          <h2 className="text-lg font-semibold text-mayden-dark">1. Information We Collect</h2>
          <p>We collect the name, email address, and WhatsApp number you provide when creating an account. We also process account and subscription status, payment amounts and references, the last four digits of a card when supplied by the payment processor, and listening activity such as episodes played.</p>
          <h2 className="text-lg font-semibold text-mayden-dark">2. How We Use Your Information</h2>
          <p>We use this information to create and secure accounts, provide audio and subscription access, process and reconcile payments, send account or service messages (including a daily listening reminder to active subscribers unless it is turned off in account settings), respond to support requests, and maintain and improve the service.</p>
          <h2 className="text-lg font-semibold text-mayden-dark">3. Data Protection</h2>
          <p>We use technical and organizational safeguards intended to protect account information. Passwords are stored as password hashes. Paystack processes payments; Money & Mind does not collect or store full payment-card numbers. Email delivery may be handled by Brevo. Service providers that host or operate the app may process information on our behalf. We may also disclose information where required by law. No online service can guarantee absolute security.</p>
          <h2 className="text-lg font-semibold text-mayden-dark">4. Retention</h2>
          <p>We retain information for as long as needed to operate your account and provide the service, and as needed for security, dispute handling, accounting, and legal obligations. Some records may need to be retained after an account is closed where the law requires it.</p>
          <h2 className="text-lg font-semibold text-mayden-dark">5. Your Rights</h2>
          <p>You may request access to or correction of your personal information, and may ask about deletion or other rights available under applicable data-protection law. We may need to retain some records for legal or operational reasons. Our privacy-request contact details are being verified and will be added to this policy once confirmed.</p>
          <h2 className="text-lg font-semibold text-mayden-dark">6. Contact</h2>
          <p>Our contact details for privacy questions and requests are being verified. We will update this policy when a monitored contact channel has been confirmed.</p>
        </div>
      </div>
    </div>
  );
}
