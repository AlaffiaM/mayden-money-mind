import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

let idSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, message) => {
      const id = ++idSeq;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => dismiss(id), 3500);
    },
    [dismiss]
  );

  const toast = useCallback(
    (message, type = "success") => push(type, message),
    [push]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-xs flex-col gap-2">
        {toasts.map(({ id, type, message }) => (
          <div
            key={id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-3 shadow-lg ${
              type === "success"
                ? "border-emerald-200"
                : type === "error"
                ? "border-amber-200"
                : "border-gray-200"
            }`}
          >
            {type === "success" ? (
              <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" />
            ) : type === "error" ? (
              <XCircle size={18} className="mt-0.5 flex-shrink-0 text-amber-600" />
            ) : (
              <Info size={18} className="mt-0.5 flex-shrink-0 text-gray-400" />
            )}
            <p className="flex-1 text-sm text-mayden-dark">{message}</p>
            <button onClick={() => dismiss(id)} aria-label="Dismiss" className="text-gray-300 hover:text-gray-500">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}