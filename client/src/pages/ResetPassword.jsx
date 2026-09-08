import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { Loader2, CheckCircle2, Mail, KeyRound } from "lucide-react";
import PasswordInput from "../components/ui/PasswordInput";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    email: searchParams.get("email") || "",
    code: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => {
    if (key === "code") {
      const value = e.target.value.replace(/\D/g, "").slice(0, 6);
      setForm((f) => ({ ...f, code: value }));
      return;
    }
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(form.code.trim())) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        email: form.email.trim().toLowerCase(),
        code: form.code.trim(),
        password: form.password,
      });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/assets/logo.jpg"
            alt="Money & Mind"
            className="w-16 h-16 object-contain mx-auto mb-4"
          />
          <h1 className="font-serif text-2xl font-bold text-mayden-dark">Set a new password</h1>
          <p className="text-sm text-gray-500 mt-1">
            Enter the 6-digit code from the email, then choose a new password
          </p>
        </div>

        {done ? (
          <div className="p-4 rounded-lg bg-green-50 border border-green-100 text-sm text-green-700 text-center">
            <CheckCircle2 size={20} className="mx-auto mb-2" />
            Your password has been reset. You can now sign in with your new password.
            <div className="mt-4">
              <Link
                to="/login"
                className="inline-block text-mayden-magenta font-semibold hover:underline"
              >
                Go to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600 text-center">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
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
                  autoComplete="email"
                  value={form.email}
                  onChange={update("email")}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20 focus:border-mayden-magenta"
                  placeholder="you@email.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Verification code
              </label>
              <div className="relative">
                <KeyRound
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  value={form.code}
                  onChange={update("code")}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20 focus:border-mayden-magenta"
                  placeholder="000000"
                />
              </div>
            </div>

            <PasswordInput
              id="password"
              label="New Password"
              value={form.password}
              onChange={update("password")}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
              minLength={8}
            />

            <PasswordInput
              id="confirmPassword"
              label="Confirm Password"
              value={form.confirmPassword}
              onChange={update("confirmPassword")}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              required
              minLength={8}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-mayden-magenta text-white font-semibold text-sm hover:bg-mayden-magenta/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            <p className="text-sm text-center text-gray-500">
              <Link to="/forgot-password" className="text-mayden-magenta font-semibold hover:underline">
                Request a new code
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}