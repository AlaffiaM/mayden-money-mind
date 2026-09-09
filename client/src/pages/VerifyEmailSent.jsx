import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { Mail, RefreshCw, Loader2, CheckCircle, Clock } from "lucide-react";
import VerifyCodeForm from "../components/ui/VerifyCodeForm";
import AuthLayout from "../components/ui/AuthLayout";

const RESEND_COOLDOWN = 60;

function formatCountdown(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VerifyEmailSent() {
  const { user, resendVerification } = useAuth();
  const navigate = useNavigate();
  const email = user?.email || "";
  const [status, setStatus] = useState("idle");
  const [msg, setMsg] = useState("");
  const [cooldownStart, setCooldownStart] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (cooldownStart === null) return;
    const id = setInterval(() => {
      const remaining = Math.max(
        0,
        RESEND_COOLDOWN - Math.floor((Date.now() - cooldownStart) / 1000),
      );
      setCountdown(remaining);
      if (remaining <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownStart]);

  useEffect(() => {
    if (!verified) return;
    const id = setTimeout(
      () => navigate("/dashboard", { replace: true }),
      1500,
    );
    return () => clearTimeout(id);
  }, [verified, navigate]);

  const handleResend = async () => {
    if (!email || status === "sending" || countdown > 0 || verified) return;
    setStatus("sending");
    setMsg("");
    try {
      await resendVerification(email);
      setStatus("sent");
      setMsg("Verification email sent — check your inbox (and spam folder).");
      setCountdown(RESEND_COOLDOWN);
      setCooldownStart(Date.now());
    } catch (err) {
      setStatus("error");
      setMsg(
        err.response?.data?.error ||
          "Couldn't send a new code. Please try again shortly.",
      );
    }
  };

  const buttonDisabled = status === "sending" || countdown > 0 || verified;
  const buttonLabel =
    status === "sending"
      ? "Sending…"
      : countdown > 0
        ? `Resend in ${formatCountdown(countdown)}`
        : "Resend verification email";

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={
        <>
          We've sent a 6-digit verification code to{" "}
          <span className="font-semibold text-mayden-dark">
            {email || "your email"}
          </span>
          .
        </>
      }
      footer={
        <p>
          Already verified?{" "}
          <Link
            to="/login"
            className="text-mayden-magenta font-semibold hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-mayden-magenta/10">
          <Mail size={26} className="text-mayden-magenta" />
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Once you confirm your email, you'll be able to access your
          subscription and daily audio. The code expires in 30 minutes.
        </p>

        {status === "sending" && (
          <div className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-mayden-magenta/5 py-3 text-sm font-medium text-mayden-magenta">
            <Loader2 size={16} className="animate-spin" />
            Sending verification email…
          </div>
        )}
        {status === "sent" && (
          <div className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-green-50 py-3 text-sm font-medium text-green-700">
            <CheckCircle size={16} />
            {msg || "Verification email sent — check your inbox."}
          </div>
        )}
        {status === "error" && (
          <div className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-red-50 py-3 text-sm font-medium text-red-600">
            {msg}
          </div>
        )}

        {!verified && (
          <div className="mt-4 w-full">
            <VerifyCodeForm email={email} onSuccess={() => setVerified(true)} />
          </div>
        )}
        {verified && (
          <div className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-green-50 py-3 text-sm font-medium text-green-700">
            <CheckCircle size={16} />
            Email verified! Taking you to your dashboard…
          </div>
        )}

        <button
          type="button"
          onClick={handleResend}
          disabled={buttonDisabled}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-mayden-magenta hover:text-mayden-magenta disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "sending" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : countdown > 0 ? (
            <Clock size={16} />
          ) : (
            <RefreshCw size={16} />
          )}
          {buttonLabel}
        </button>
      </div>
    </AuthLayout>
  );
}
