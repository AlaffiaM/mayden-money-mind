import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

export default function Support() {
  return (
    <div className="min-h-screen bg-white px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="text-sm text-mayden-magenta hover:underline mb-8 inline-block">&larr; Back to Home</Link>
        <h1 className="text-3xl font-serif font-bold text-mayden-dark mb-2">Contact Support</h1>
        <p className="text-gray-500 mb-8">Our support contact details are being verified. Please check back soon.</p>

        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-mayden-magenta/10 flex items-center justify-center">
              <Mail size={18} className="text-mayden-magenta" />
            </div>
            <div>
              <p className="text-sm font-semibold text-mayden-dark">Contact details pending</p>
              <p className="text-sm text-gray-500">
                We will publish a support channel once it has been confirmed.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
