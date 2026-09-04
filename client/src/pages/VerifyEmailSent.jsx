// "Check your inbox" page — shown right after registering (or logging in while
// unverified). Auto-sends the verification email on mount and shows a 60-second
// cooldown, based on a start timestamp so the countdown is always accurate.
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, RefreshCw, Loader2, CheckCircle, Clock } from "lucide-react";

const RESEND_COOLDOWN = 60;

function formatCountdown(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VerifyEmailSent() {
  const { user, resendVerification } = useAuth();
  const email = user?.email || "";
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [msg, setMsg] = useState("");
  const [cooldownStart, setCooldownStart] = useState(null); // timestamp ms
  const [countdown, setCountdown] = useState(0);
  const sentRef = useRef(false);

  // Keep the countdown fresh while a cooldown is active
  useEffect(() => {
    if (cooldownStart === null) return;
    const id = setInterval(() => {
      const remaining = Math.max(0, RESEND_COOLDOWN - Math.floor((Date.now() - cooldownStart) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownStart]);

  // Auto-send once on mount — inline async, no stale closure
  useEffect(() => {
    if (!email || sentRef.current) return;
    sentRef.current = true;

    const send = async () => {
      setStatus("sending");
      try {
        await resendVerification(email);
        setStatus("sent");
        setCountdown(RESEND_COOLDOWN);
        setCooldownStart(Date.now());
      } catch {
        setStatus("error");
      }
    };
    send();
  }, [email, resendVerification]);

  const handleResend = async () => {
    if (!email || status === "sending" || countdown > 0) return;
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
      setMsg(err.response?.data?.error || "Couldn't send a new link. Please try again shortly.");
    }
  };

  const buttonDisabled = status === "sending" || countdown > 0;
  const buttonLabel =
    status === "sending"
      ? "Sending…"
      : countdown > 0
        ? `Resend in ${formatCountdown(countdown)}`
        : "Resend verification email";

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <img
          src="/assets/logo.jpg"
          alt="Money & Mind"
          className="w-16 h-16 object-contain mx-auto mb-6"
        />
        <div className="w-14 h-14 rounded-full bg-mayden-magenta/10 flex items-center justify-center">
          <Mail size={28} className="text-mayden-magenta" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-mayden-dark mt-4">
          Verify your email
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          We've sent a verification link to{" "}
          <span className="font-semibold text-mayden-dark">{email || "your email"}</span>.
        </p>
        <p className="text-xs text-gray-400 mt-2 max-w-xs">
          Once you confirm your email you'll be able to access your subscription and
          daily audio. The link expires in 24 hours.
        </p>

        {/* Status banner */}
        {status === "sending" && (
          <div className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-mayden-magenta/5 text-mayden-magenta text-sm font-medium">
            <Loader2 size={16} className="animate-spin" />
            Sending verification email…
          </div>
        )}
        {status === "sent" && (
          <div className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-green-50 text-green-700 text-sm font-medium">
            <CheckCircle size={16} />
            {msg || "Verification email sent — check your inbox."}
          </div>
        )}
        {status === "error" && (
          <div className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium">
            {msg}
          </div>
        )}

        {/* Resend button with cooldown */}
        <button
          type="button"
          onClick={handleResend}
          disabled={buttonDisabled}
          className="mt-4 w-full py-3 rounded-lg border border-gray-200 text-gray-600 font-semibold text-sm hover:border-mayden-magenta hover:text-mayden-magenta transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

        <p className="text-sm text-gray-500 mt-6">
          Already verified?{" "}
          <Link to="/login" className="text-mayden-magenta font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
