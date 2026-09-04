// "Check your inbox" page — shown right after registering (or logging in while
// unverified). Auto-sends the verification email on mount so the user never has
// to click "Resend" to get the first link. The button stays for retries.
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, RefreshCw, Loader2, CheckCircle } from "lucide-react";

export default function VerifyEmailSent() {
  const { user, resendVerification } = useAuth();
  const email = user?.email || "";
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [msg, setMsg] = useState("");
  const sentRef = useRef(false);

  const handleResend = async () => {
    if (!email || status === "sending") return;
    setStatus("sending");
    setMsg("");
    try {
      await resendVerification(email);
      setStatus("sent");
      setMsg("Verification email sent — check your inbox (and spam folder).");
    } catch (err) {
      setStatus("error");
      setMsg(err.response?.data?.error || "Couldn't send a new link. Please try again shortly.");
    }
  };

  // Auto-send once on mount so the user doesn't have to click anything
  useEffect(() => {
    if (!email || sentRef.current) return;
    sentRef.current = true;
    handleResend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

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
          We're sending a verification link to{" "}
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

        <button
          type="button"
          onClick={handleResend}
          disabled={status === "sending"}
          className="mt-4 w-full py-3 rounded-lg border border-gray-200 text-gray-600 font-semibold text-sm hover:border-mayden-magenta hover:text-mayden-magenta transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <RefreshCw size={16} />
          Resend verification email
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
