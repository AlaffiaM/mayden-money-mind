// Contact Support placeholder page
import { Link } from "react-router-dom";
import { Mail, Phone } from "lucide-react";

export default function Support() {
  return (
    <div className="min-h-screen bg-white px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="text-sm text-mayden-magenta hover:underline mb-8 inline-block">&larr; Back to Home</Link>
        <h1 className="text-3xl font-serif font-bold text-mayden-dark mb-2">Contact Support</h1>
        <p className="text-gray-500 mb-8">We're here to help. Reach out through any of the channels below.</p>

        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-mayden-magenta/10 flex items-center justify-center">
              <Mail size={18} className="text-mayden-magenta" />
            </div>
            <div>
              <p className="text-sm font-semibold text-mayden-dark">Email</p>
              <p className="text-sm text-gray-500">support@maydenbank.com</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-mayden-magenta/10 flex items-center justify-center">
              <Phone size={18} className="text-mayden-magenta" />
            </div>
            <div>
              <p className="text-sm font-semibold text-mayden-dark">Phone</p>
              <p className="text-sm text-gray-500">+234 (0) 800 MAYDEN</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
