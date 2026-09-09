import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Mail, Loader2, Shield } from "lucide-react";
import PasswordInput from "../../components/ui/PasswordInput";
import AuthLayout from "../../components/ui/AuthLayout";

export default function AdminLogin() {
  const { login, loading } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(form.email, form.password, true);
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    }
  };

  return (
    <AuthLayout
      title="Admin Panel"
      subtitle="Sign in with an administrator account"
      footer={
        <span className="flex items-center justify-center gap-1.5">
          <Shield size={12} /> Admin access only. Contact the system
          administrator if you need access.
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-700">
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
              autoComplete="username"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:border-mayden-magenta focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20"
              placeholder="admin@email.com"
            />
          </div>
        </div>

        <PasswordInput
          id="password"
          label="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-mayden-dark py-3 text-sm font-semibold text-white transition-colors hover:bg-mayden-dark/90 disabled:opacity-50"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}
