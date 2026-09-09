import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";

export default function ErrorBanner() {
  const [error, setError] = useState(null);

  useEffect(() => {
    const onApiError = (e) => {
      const message =
        e.detail?.message || "Something went wrong. Please try again.";
      setError({ message });
    };
    const clear = () => setError(null);
    window.addEventListener("api:error", onApiError);
    window.addEventListener("api:error:clear", clear);
    return () => {
      window.removeEventListener("api:error", onApiError);
      window.removeEventListener("api:error:clear", clear);
    };
  }, []);

  if (!error) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] border-b border-amber-200 bg-amber-50 text-amber-900 shadow-sm">
      <div className="mx-auto flex max-w-3xl items-start justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-start gap-2">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="min-w-0">
            <p className="text-sm font-medium">Something went wrong</p>
            <p className="text-xs text-amber-800/80">{error.message}</p>
          </div>
        </div>
        <button
          onClick={() => setError(null)}
          className="shrink-0 rounded-full p-1 text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-900"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
