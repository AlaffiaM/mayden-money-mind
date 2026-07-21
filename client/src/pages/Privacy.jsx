// Privacy Policy placeholder page (NDPA compliant)
import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="text-sm text-mayden-magenta hover:underline mb-8 inline-block">&larr; Back to Home</Link>
        <h1 className="text-3xl font-serif font-bold text-mayden-dark mb-6">Privacy Policy</h1>
        <div className="prose prose-sm text-gray-600 leading-relaxed space-y-4">
          <p>Effective Date: January 1, 2026</p>
          <p>This Privacy Policy describes how Mayden Microfinance Bank ("we", "us") collects, uses, and protects your personal information in compliance with the Nigeria Data Protection Regulation (NDPR) and the Nigeria Data Protection Act (NDPA).</p>
          <h2 className="text-lg font-semibold text-mayden-dark">1. Information We Collect</h2>
          <p>We collect your name, email address, phone number, payment history, and listening activity data when you use the Money & Mind service.</p>
          <h2 className="text-lg font-semibold text-mayden-dark">2. How We Use Your Information</h2>
          <p>Your information is used to provide and improve the Service, process payments, send notifications, and communicate with you about your subscription.</p>
          <h2 className="text-lg font-semibold text-mayden-dark">3. Data Protection</h2>
          <p>We implement bank-grade encryption and security measures to protect your personal data. Your data is stored securely and is not shared with third parties except as required by law.</p>
          <h2 className="text-lg font-semibold text-mayden-dark">4. Your Rights</h2>
          <p>Under the NDPA, you have the right to access, correct, delete, and port your personal data. To exercise these rights, contact our support team.</p>
          <h2 className="text-lg font-semibold text-mayden-dark">5. Contact</h2>
          <p>For privacy-related inquiries, please contact support through the app or email us at support@maydenbank.com.</p>
        </div>
      </div>
    </div>
  );
}
