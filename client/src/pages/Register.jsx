import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, User, Phone, Loader2 } from "lucide-react";
import PasswordInput from "../components/ui/PasswordInput";
import AuthLayout from "../components/ui/AuthLayout";
import { getUtm } from "../utils/utm";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form) {
  const errors = {};
  if (form.fullName.trim().length < 2) {
    errors.fullName = "A valid full name is required";
  }
  if (!EMAIL_RE.test(form.email.trim())) {
    errors.email = "A valid email is required";
  }
  if (form.phone.trim() && (form.phone.trim().length < 7 || form.phone.trim().length > 20)) {
    errors.phone = "Enter a valid phone number";
  }
  if (form.password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  }
  if (!form.confirmPassword) {
    errors.confirmPassword = "Please confirm your password";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }
  if (!form.acceptedTerms) {
    errors.acceptedTerms = "Please accept the Terms & Privacy Policy";
  }
  return errors;
}

function passwordStrength(password) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score < 2) return { label: "Weak", color: "bg-red-500", width: "25%" };
  if (score < 4) return { label: "Fair", color: "bg-amber-500", width: "60%" };
  return { label: "Strong", color: "bg-green-500", width: "100%" };
}

export default function Register() {
  const { register, loading } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptedTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  const setField = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      await register(
        form.fullName.trim(),
        form.email.trim().toLowerCase(),
        form.phone.trim(),
        form.password,
        getUtm()
      );
    } catch (err) {
      setServerError(err.response?.data?.error || "Registration failed. Please try again.");
    }
  };

  const strength = passwordStrength(form.password);
  const inputClass = (hasError) =>
    `w-full rounded-lg border py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20 focus:border-mayden-magenta ${
      hasError ? "border-red-400" : "border-gray-200"
    }`;

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start your daily motivation journey"
      footer={
        <p>
          Already have an account?{" "}
          <Link to="/login" className="text-mayden-magenta font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {serverError && (
          <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-center text-sm text-red-600">
            {serverError}
          </div>
        )}

        <div>
          <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="fullName"
              type="text"
              required
              autoFocus
              autoComplete="name"
              value={form.fullName}
              onChange={setField("fullName")}
              className={inputClass(errors.fullName)}
              placeholder="Your full name"
            />
          </div>
          {errors.fullName && <p className="mt-1.5 text-xs text-red-600">{errors.fullName}</p>}
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
            Email
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={setField("email")}
              className={inputClass(errors.email)}
              placeholder="you@email.com"
            />
          </div>
          {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-gray-700">
            Phone (optional)
          </label>
          <div className="relative">
            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={setField("phone")}
              className={inputClass(errors.phone)}
              placeholder="080 1234 5678"
            />
          </div>
          {errors.phone && <p className="mt-1.5 text-xs text-red-600">{errors.phone}</p>}
        </div>

        <PasswordInput
          id="password"
          label="Password"
          value={form.password}
          onChange={setField("password")}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
          minLength={8}
          error={errors.password}
        />

        {strength && (
          <div className="-mt-2">
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all ${strength.color}`}
                  style={{ width: strength.width }}
                />
              </div>
              <span className="text-xs text-gray-500">{strength.label}</span>
            </div>
          </div>
        )}

        <PasswordInput
          id="confirmPassword"
          label="Confirm Password"
          value={form.confirmPassword}
          onChange={setField("confirmPassword")}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          required
          minLength={8}
          error={errors.confirmPassword}
        />

        <div>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={form.acceptedTerms}
              onChange={setField("acceptedTerms")}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-mayden-magenta focus:ring-mayden-magenta"
            />
            <span>
              I agree to the{" "}
              <Link to="/terms" className="text-mayden-magenta hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="text-mayden-magenta hover:underline">
                Privacy Policy
              </Link>
            </span>
          </label>
          {errors.acceptedTerms && (
            <p className="mt-1.5 text-xs text-red-600">{errors.acceptedTerms}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-mayden-magenta py-3 text-sm font-semibold text-white transition-colors hover:bg-mayden-magenta/90 disabled:opacity-50"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Creating account..." : "Create Account"}
        </button>

        <p className="text-center text-xs text-gray-400">
          We'll email you a 6-digit code to verify your account before you can start listening.
        </p>
      </form>
    </AuthLayout>
  );
}