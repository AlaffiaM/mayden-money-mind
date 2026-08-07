// Reset password page — reached from the emailed reset link (?token=...).
// Sets a new password, then sends the user to the sign-in page.
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { Loader2, CheckCircle2 } from "lucide-react";
import PasswordInput from "../components/ui/PasswordInput";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
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
      await api.post("/auth/reset-password", { token, password: form.password });
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
          <p className="text-sm text-gray-500 mt-1">Choose a strong password you'll remember</p>
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
        ) : !token ? (
          <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600 text-center">
            This reset link is missing its token. Please use the link from your email.
            <div className="mt-4">
              <Link to="/forgot-password" className="text-mayden-magenta font-semibold hover:underline">
                Request a new link
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

            <PasswordInput
              id="password"
              label="New Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
              minLength={8}
            />

            <PasswordInput
              id="confirmPassword"
              label="Confirm Password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
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
          </form>
        )}
      </div>
    </div>
  );
}
