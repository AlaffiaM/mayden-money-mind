// Global error banner — shows the most recent API error on the page
// without any redirect or page refresh. Dismissible.
import { useEffect, useState } from "react";

export default function ErrorBanner() {
  const [error, setError] = useState(null);

  useEffect(() => {
    const onApiError = (e) => {
      const { method, url, status, message } = e.detail || {};
      setError({ method, url, status, message });
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
    <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white text-sm shadow-lg">
      <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-start justify-between gap-3">
        <div className="font-mono min-w-0">
          <span className="font-bold">{error.method} {error.url}</span>
          {error.status ? <span> -&gt; {error.status}</span> : null}
          {error.message ? <span className="opacity-90"> - {error.message}</span> : null}
        </div>
        <button
          onClick={() => setError(null)}
          className="text-white/80 hover:text-white shrink-0 text-lg leading-none"
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
