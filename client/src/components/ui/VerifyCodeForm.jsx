import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Loader2 } from "lucide-react";

const DIGITS = [0, 1, 2, 3, 4, 5];

export default function VerifyCodeForm({ email, onSuccess, onError }) {
  const { verifyEmail, loading } = useAuth();
  const [digits, setDigits] = useState(DIGITS.map(() => ""));
  const [error, setError] = useState("");
  const refs = useRef([]);
  const workingRef = useRef(false);

  const code = digits.join("");
  const complete = code.length === 6;

  const focusIndex = (i) => refs.current[i]?.focus();

  const handleChange = (i, raw) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;
    setDigits((prev) => {
      const next = [...prev];
      next[i] = digit;
      return next;
    });
    focusIndex(i + 1);
  };

  const handleKeyDown = (e, i) => {
    if (e.key !== "Backspace") return;
    e.preventDefault();
    setDigits((prev) => {
      const next = [...prev];
      if (next[i]) {
        next[i] = "";
      } else if (i > 0) {
        next[i - 1] = "";
        focusIndex(i - 1);
      }
      return next;
    });
  };

  const handlePaste = (e, startIdx) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    setDigits((prev) => {
      const next = [...prev];
      for (let j = 0; j < text.length; j++) next[j] = text[j];
      return next;
    });
    focusIndex(Math.min(startIdx + text.length, 5));
  };

  const submit = useCallback(async () => {
    if (!complete || loading || workingRef.current) return;
    workingRef.current = true;
    setError("");
    try {
      const data = await verifyEmail(email, code);
      onSuccess?.(data);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Couldn't verify that code. Please try again.",
      );
      onError?.(err);
      setDigits(DIGITS.map(() => ""));
      focusIndex(0);
    } finally {
      workingRef.current = false;
    }
  }, [complete, email, loading, code, verifyEmail, onSuccess, onError]);

  useEffect(() => {
    if (complete && !loading && !workingRef.current) {
      const id = setTimeout(() => submit(), 300);
      return () => clearTimeout(id);
    }
  }, [complete, loading, submit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    submit();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex justify-center gap-2">
        {DIGITS.map((_, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={digits[i]}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={(e) => handlePaste(e, i)}
            aria-label={`Digit ${i + 1}`}
            className="h-12 w-11 rounded-lg border border-gray-200 text-center text-xl font-bold text-mayden-dark focus:border-mayden-magenta focus:outline-none focus:ring-2 focus:ring-mayden-magenta/30"
          />
        ))}
      </div>

      {error && (
        <p className="mt-3 text-center text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={!complete || loading}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-mayden-magenta py-3 text-sm font-semibold text-white transition-colors hover:bg-mayden-magenta/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {loading ? "Verifying…" : "Verify email"}
      </button>
    </form>
  );
}
