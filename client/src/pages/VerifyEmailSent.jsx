// "Check your inbox" page — shown right after registering (or logging in while
// unverified). Lets the user resend the verification email and explains why they
// can't access their dashboard yet.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, RefreshCw, Loader2 } from "lucide-react";

export default function VerifyEmailSent() {
  const { user, resendVerification } = useAuth();
  const email = user?.email || "";
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [msg, setMsg] = useState("");

  const handleResend = async () => {
    if (!email || status === "sending") return;
    setStatus("sending");
    setMsg("");
    try {
      await resendVerification(email);
      setStatus("sent");
      setMsg("A new verification link has been sent. It's valid for 24 hours.");
    } catch (err) {
      setStatus("error");
      setMsg(err.response?.data?.error || "Couldn't send a new link. Please try again shortly.");
    }
  };

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
          daily audio. The link expires in 24 hours. Check your spam folder if you
          don't see it.
        </p>

        <button
          type="button"
          onClick={handleResend}
          disabled={status === "sending"}
          className="mt-6 w-full py-3 rounded-lg bg-mayden-magenta text-white font-semibold text-sm hover:bg-mayden-magenta/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {status === "sending" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          {status === "sending" ? "Sending…" : "Resend verification email"}
        </button>

        {msg && <p className="mt-3 text-sm text-gray-600">{msg}</p>}

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
