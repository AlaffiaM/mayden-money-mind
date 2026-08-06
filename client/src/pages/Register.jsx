// Registration page — creates new user account, redirects to /subscription after success
// Client-side validation mirrors the server rules (name ≥2, email format, password ≥8)
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, User, Phone, Loader2 } from "lucide-react";
import PasswordInput from "../components/ui/PasswordInput";

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
        form.password
      );
    } catch (err) {
      setServerError(err.response?.data?.error || "Registration failed. Please try again.");
    }
  };

  const strength = passwordStrength(form.password);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/assets/logo.jpg"
            alt="Money & Mind"
            className="w-16 h-16 object-contain mx-auto mb-4"
          />
          <h1 className="font-serif text-2xl font-bold text-mayden-dark">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">Start your daily motivation journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {serverError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600 text-center">
              {serverError}
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
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
                className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20 focus:border-mayden-magenta ${
                  errors.fullName ? "border-red-400" : "border-gray-200"
                }`}
                placeholder="Your full name"
              />
            </div>
            {errors.fullName && <p className="mt-1.5 text-xs text-red-600">{errors.fullName}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
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
                className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20 focus:border-mayden-magenta ${
                  errors.email ? "border-red-400" : "border-gray-200"
                }`}
                placeholder="you@email.com"
              />
            </div>
            {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
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
                className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20 focus:border-mayden-magenta ${
                  errors.phone ? "border-red-400" : "border-gray-200"
                }`}
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
                <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
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
            <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
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
            className="w-full py-3 rounded-lg bg-mayden-magenta text-white font-semibold text-sm hover:bg-mayden-magenta/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-mayden-magenta font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
