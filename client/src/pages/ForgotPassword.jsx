import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { Mail, Loader2 } from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import AuthLayout from "../components/ui/AuthLayout";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!EMAIL_RE.test(email.trim())) {
      setError("A valid email is required");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });
      setSent(true);
    } catch (err) {
      setError(
        err.response?.data?.error || "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle={
        sent
          ? "Check your inbox for the reset code"
          : "Enter your email and we'll send you a reset code"
      }
      footer={
        <p>
          <Link
            to="/login"
            className="text-mayden-magenta font-semibold hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      }
    >
      {sent ? (
        <div className="rounded-xl border border-green-100 bg-green-50 p-5 text-center text-sm text-green-700">
          <CheckCircle2 size={24} className="mx-auto mb-2 text-green-600" />
          {email.trim().toLowerCase() && (
            <p>
              If an account exists for{" "}
              <span className="font-semibold">
                {email.trim().toLowerCase()}
              </span>
              , a 6-digit reset code is on its way. The code expires in 30
              minutes.
            </p>
          )}
          <Link
            to={`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`}
            className="mt-4 inline-block w-full rounded-lg bg-mayden-magenta py-3 text-sm font-semibold text-white transition-colors hover:bg-mayden-magenta/90"
          >
            Enter the code
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-700">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                id="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:border-mayden-magenta focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20"
                placeholder="you@email.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-mayden-magenta py-3 text-sm font-semibold text-white transition-colors hover:bg-mayden-magenta/90 disabled:opacity-50"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Sending…" : "Send reset code"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
