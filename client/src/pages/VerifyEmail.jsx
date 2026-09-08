import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CheckCircle2, RefreshCw } from "lucide-react";
import VerifyCodeForm from "../components/ui/VerifyCodeForm";
import AuthLayout from "../components/ui/AuthLayout";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { user, resendVerification } = useAuth();
  const [email, setEmail] = useState(() => {
    if (user?.email) return user.email;
    try {
      return JSON.parse(sessionStorage.getItem("user") || "{}")?.email || "";
    } catch {
      return "";
    }
  });
  const [status, setStatus] = useState("entry");
  const [resendMsg, setResendMsg] = useState("");

  useEffect(() => {
    if (status !== "success") return;
    const id = setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
    return () => clearTimeout(id);
  }, [status, navigate]);

  const handleResend = async () => {
    setResendMsg("");
    if (!email) {
      setResendMsg("Enter the email you registered with first.");
      return;
    }
    try {
      await resendVerification(email);
      setResendMsg("A new verification code has been sent to your email.");
    } catch (err) {
      setResendMsg(err.response?.data?.error || "Please try again shortly.");
    }
  };

  if (status === "success") {
    return (
      <AuthLayout
        title="Email verified!"
        subtitle="Your email is confirmed — you can now access your daily audio."
      >
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <CheckCircle2 size={34} className="text-green-600" />
          </div>
          <Link
            to="/dashboard"
            className="mt-6 w-full rounded-lg bg-mayden-magenta py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-mayden-magenta/90"
          >
            Go to Dashboard
          </Link>
          <p className="mt-3 text-sm text-gray-500">
            Taking you to your dashboard…
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="Enter your email and the 6-digit code we sent you."
    >
      <div className="space-y-4">
        <label className="block">
          <span className="text-xs font-medium text-gray-500">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-mayden-magenta focus:outline-none focus:ring-2 focus:ring-mayden-magenta/40"
          />
        </label>

        <VerifyCodeForm email={email} onSuccess={() => setStatus("success")} onError={() => setResendMsg("")} />

        <div className="border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={handleResend}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-mayden-magenta hover:text-mayden-magenta"
          >
            <RefreshCw size={16} />
            Resend verification code
          </button>
          {resendMsg && <p className="mt-3 text-center text-sm text-gray-600">{resendMsg}</p>}
        </div>

        <p className="text-center text-sm text-gray-500">
          No account yet?{" "}
          <Link to="/register" className="text-mayden-magenta font-semibold hover:underline">
            Register
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}