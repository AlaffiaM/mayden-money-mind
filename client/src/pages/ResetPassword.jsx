import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { Loader2, CheckCircle2, Mail, KeyRound } from "lucide-react";
import PasswordInput from "../components/ui/PasswordInput";
import AuthLayout from "../components/ui/AuthLayout";

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
      setError(
        err.response?.data?.error || "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthLayout
        title="Password reset"
        subtitle="Your password has been updated"
        footer={
          <p>
            <Link
              to="/login"
              className="text-mayden-magenta font-semibold hover:underline"
            >
              Go to sign in
            </Link>
          </p>
        }
      >
        <div className="rounded-xl border border-green-100 bg-green-50 p-5 text-center text-sm text-green-700">
          <CheckCircle2 size={24} className="mx-auto mb-2 text-green-600" />
          You can now sign in with your new password.
        </div>
      </AuthLayout>
    );
  }

  const inputClass = (extra = "") =>
    `w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:border-mayden-magenta focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20 ${extra}`;

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Enter the 6-digit code from the email, then choose a new password"
      footer={
        <p>
          <Link
            to="/forgot-password"
            className="text-mayden-magenta font-semibold hover:underline"
          >
            Request a new code
          </Link>
        </p>
      }
    >
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
              autoComplete="email"
              value={form.email}
              onChange={update("email")}
              className={inputClass()}
              placeholder="you@email.com"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="code"
            className="mb-1.5 block text-sm font-medium text-gray-700"
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
              className={inputClass("font-mono tracking-[0.3em]")}
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
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-mayden-magenta py-3 text-sm font-semibold text-white transition-colors hover:bg-mayden-magenta/90 disabled:opacity-50"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </AuthLayout>
  );
}
