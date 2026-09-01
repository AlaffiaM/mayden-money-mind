// Email verification page — consumes the single-use token from the link and shows
// success, expired, used, or invalid states. Failed states offer a resend action.
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const storedEmail = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("user") || "{}")?.email || "";
    } catch {
      return "";
    }
  })();

  const { verifyEmail, resendVerification, user } = useAuth();
  const [status, setStatus] = useState("loading"); // loading | success | expired | used | invalid
  const [resendMsg, setResendMsg] = useState("");

  // Resolve the email we should use for resend: the verified-in-progress token has
  // no scope; fall back to the logged-in email if present.
  const email = user?.email || storedEmail;

  useEffect(() => {
    (async () => {
      if (!token) {
        setStatus("invalid");
        return;
      }
      try {
        await verifyEmail(token);
        setStatus("success");
      } catch (err) {
        const msg = err.response?.data?.error || "";
        if (/expired/i.test(msg)) setStatus("expired");
        else if (/already been used/i.test(msg)) setStatus("used");
        else setStatus("invalid");
      }
    })();
    // run once per token
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleResend = async () => {
    setResendMsg("");
    if (!email) {
      setResendMsg("We need the email you registered with.");
      return;
    }
    try {
      await resendVerification(email);
      setResendMsg("A new verification link has been sent to your email.");
    } catch (err) {
      setResendMsg(err.response?.data?.error || "Please try again shortly.");
    }
  };

  if (status === "loading") {
    return (
      <Centered>
        <Loader2 size={40} className="animate-spin text-mayden-magenta mx-auto" />
        <p className="text-sm text-gray-500 text-center mt-4">Verifying your email…</p>
      </Centered>
    );
  }

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
      </Centered>
    );
  }

  // expired | used | invalid — all share a failure layout with a resend action
  const messages = {
    expired: {
      title: "Link expired",
      body: "This verification link has expired. Request a new one — it stays valid for 24 hours.",
      showResend: true,
    },
    used: {
      title: "Link already used",
      body: "This verification link has already been used. If you still can't sign in, request a new link.",
      showResend: true,
    },
    invalid: {
      title: "Invalid link",
      body: "This verification link isn't valid. Check the link or request a new one.",
      showResend: true,
    },
  }[status];

  return (
    <Centered>
      <AlertCircle size={48} className="mx-auto text-amber-500" />
      <h1 className="font-serif text-2xl font-bold text-mayden-dark text-center mt-4">{messages.title}</h1>
      <p className="text-sm text-gray-500 text-center mt-2">{messages.body}</p>

      {messages.showResend && (
        <div className="mt-6 w-full max-w-xs">
          {email ? (
            <>
              <button
                type="button"
                onClick={handleResend}
                className="w-full py-3 rounded-lg bg-mayden-magenta text-white font-semibold text-sm hover:bg-mayden-magenta/90 transition-colors"
              >
                Resend verification email
              </button>
              {resendMsg && (
                <p className="mt-3 text-sm text-center text-gray-600">{resendMsg}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-center text-gray-500">
              <Link to="/register" className="text-mayden-magenta font-semibold hover:underline">
                Register
              </Link>{" "}
              to receive a verification link.
            </p>
          )}
        </div>
      )}
    </Centered>
  );
}

// Shared centered shell matching the login/register layout
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
