import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/useAuth";
import api from "../../services/api";
import { LogOut, Library, Home, CreditCard, Bell, X, Settings } from "lucide-react";
import LogoutButton from "../ui/LogoutButton";
import { Link, useLocation } from "react-router-dom";
import LogoLockup from "../ui/LogoLockup";
import NowPlayingBar from "../ui/NowPlayingBar";

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    api
      .get("/notifications/latest")
      .then(({ data }) => setNotifications(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const markRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch (error) {
      console.error("Unable to mark notification as read.", error);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative text-gray-400 hover:text-mayden-magenta transition-colors"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-mayden-magenta text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-100 shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-semibold text-sm text-mayden-dark">
              Notifications
            </h3>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-mayden-magenta border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">
                No notifications yet
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50 last:border-0 transition-colors ${!n.read ? "bg-mayden-magenta/5" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    <Bell
                      size={12}
                      className={`mt-0.5 flex-shrink-0 ${!n.read ? "text-mayden-magenta" : "text-gray-400"}`}
                    />
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium ${!n.read ? "text-mayden-dark" : "text-gray-600"}`}
                      >
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                        {n.body}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(n.sentAt).toLocaleString()}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 bg-mayden-magenta rounded-full mt-1.5 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubscriberLayout({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  const nav = [
    { to: "/dashboard", label: "Home", icon: Home },
    { to: "/library", label: "Library", icon: Library },
    { to: "/subscription", label: "Subscription", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-[#f6f6f9]">
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            to="/dashboard"
            aria-label="Money & Mind home"
            className="shrink-0"
          >
            <LogoLockup orientation="horizontal" />
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-mayden-pink-tint text-mayden-magenta"
                      : "text-gray-500 hover:bg-gray-50 hover:text-mayden-dark"
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <span className="hidden text-sm text-gray-500 lg:inline">
              Hi, {user?.fullName?.split(" ")[0]}
            </span>
            <NotificationBell />
            <Link
              to="/settings"
              aria-label="Account settings"
              title="Account settings"
              aria-current={location.pathname === "/settings" ? "page" : undefined}
              className={`rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-mayden-magenta ${
                location.pathname === "/settings" ? "text-mayden-magenta" : ""
              }`}
            >
              <Settings size={18} />
            </Link>
            <LogoutButton
              ariaLabel="Log out"
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={18} />
            </LogoutButton>
          </div>
        </div>
        <nav
          aria-label="Main navigation"
          className="mx-auto grid max-w-6xl grid-cols-3 gap-1 px-4 pb-3 md:hidden"
        >
          {nav.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-mayden-pink-tint text-mayden-magenta"
                    : "text-gray-500 hover:bg-gray-50 hover:text-mayden-magenta"
                }`}
              >
                <item.icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-32 sm:px-6 sm:py-8">
        {children}
      </main>

      <NowPlayingBar />
    </div>
  );
}
