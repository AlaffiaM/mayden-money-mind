import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Loader2 } from "lucide-react";

export default function VerifyCodeForm({ email, onSuccess, onError }) {
  const { verifyEmail, loading } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6 || loading) return;
    setError("");
    try {
      const data = await verifyEmail(email, code);
      onSuccess?.(data);
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't verify that code. Please try again.");
      onError?.(err);
    }
  };

  const buttonDisabled = code.length !== 6 || loading;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex justify-center">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          className="w-44 text-center text-2xl tracking-[0.4em] font-mono py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-mayden-magenta/40"
          aria-label="6-digit verification code"
        />
      </div>

      {error && <p className="mt-3 text-sm text-center text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={buttonDisabled}
        className="mt-4 w-full py-3 rounded-lg bg-mayden-magenta text-white font-semibold text-sm hover:bg-mayden-magenta/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {loading ? "Verifying…" : "Verify email"}
      </button>
    </form>
  );
}