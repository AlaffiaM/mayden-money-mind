import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, Loader2 } from "lucide-react";
import PasswordInput from "../components/ui/PasswordInput";
import AuthLayout from "../components/ui/AuthLayout";

export default function Login() {
  const { login, loading } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue your journey"
      footer={
        <>
          <p>
            Don't have an account?{" "}
            <Link to="/register" className="text-mayden-magenta font-semibold hover:underline">
              Create one
            </Link>
          </p>
          <p className="mt-2">
            <Link
              to="/forgot-password"
              className="text-mayden-magenta font-semibold hover:underline"
            >
              Forgot password?
            </Link>
          </p>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-center text-sm text-red-600">
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
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:border-mayden-magenta focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20"
              placeholder="you@email.com"
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
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-mayden-magenta py-3 text-sm font-semibold text-white transition-colors hover:bg-mayden-magenta/90 disabled:opacity-50"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </AuthLayout>
  );
}