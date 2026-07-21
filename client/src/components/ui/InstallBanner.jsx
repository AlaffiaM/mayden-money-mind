// PWA install banner that prompts users to install the app and can be dismissed
import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

const DISMISS_KEY = "mayden-pwa-install-dismissed";

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(DISMISS_KEY, "true");
    }
    setDeferredPrompt(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-4 left-4 right-4 z-40 sm:max-w-sm sm:mx-auto">
      <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-mayden-magenta/10 flex items-center justify-center flex-shrink-0">
          <Download size={18} className="text-mayden-magenta" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-mayden-dark">Add to Home Screen</p>
          <p className="text-xs text-gray-500">For the best experience, install Money & Mind.</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 bg-mayden-magenta text-white text-xs font-semibold rounded-lg hover:bg-mayden-magenta/90 transition-colors"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
