import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CheckCircle2, RefreshCw } from "lucide-react";
import VerifyCodeForm from "../components/ui/VerifyCodeForm";

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
      <Centered>
        <CheckCircle2 size={48} className="mx-auto text-green-600" />
        <h1 className="font-serif text-2xl font-bold text-mayden-dark text-center mt-4">
          Email verified!
        </h1>
        <p className="text-sm text-gray-500 text-center mt-2">
          Your email is confirmed. You can now access your daily audio and subscription.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block px-8 py-3 rounded-lg bg-mayden-magenta text-white font-semibold text-sm text-center hover:bg-mayden-magenta/90"
        >
          Go to Dashboard
        </Link>
        <p className="text-sm text-gray-500 text-center mt-3">
          Taking you to your dashboard…
        </p>
      </Centered>
    );
  }

  return (
    <Centered>
      <h1 className="font-serif text-2xl font-bold text-mayden-dark text-center">
        Verify your email
      </h1>
      <p className="text-sm text-gray-500 text-center mt-2 max-w-xs">
        Enter your email and the 6-digit code we sent you. Codes expire after 30 minutes.
      </p>

      <div className="w-full max-w-xs mt-6 space-y-4">
        <label className="block">
          <span className="text-xs font-medium text-gray-500">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-mayden-magenta/40 text-sm"
          />
        </label>

        <VerifyCodeForm email={email} onSuccess={() => setStatus("success")} onError={() => setResendMsg("")} />

        <div className="border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={handleResend}
            className="w-full py-3 rounded-lg border border-gray-200 text-gray-600 font-semibold text-sm hover:border-mayden-magenta hover:text-mayden-magenta transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            Resend verification code
          </button>
          {resendMsg && <p className="mt-3 text-sm text-center text-gray-600">{resendMsg}</p>}
        </div>

        <p className="text-sm text-center text-gray-500">
          No account yet?{" "}
          <Link to="/register" className="text-mayden-magenta font-semibold hover:underline">
            Register
          </Link>
        </p>
      </div>
    </Centered>
  );
}

function Centered({ children }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm flex flex-col items-center">
        <img
          src="/assets/logo.jpg"
          alt="Money & Mind"
          className="w-16 h-16 object-contain mx-auto mb-6"
        />
        {children}
      </div>
    </div>
  );
}