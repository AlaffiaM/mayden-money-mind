// Subscriber layout — sticky header with logo, notification bell, user greeting, logout
// Includes tabbed nav bar (Home, Library, Subscription) and notification dropdown
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { LogOut, Library, Home, CreditCard, Bell, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import LogoLockup from "../ui/LogoLockup";

// Notification bell dropdown — fetches latest notifications and shows them in a popover
function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  // Fetch notifications on mount
  useEffect(() => {
    api.get("/notifications/latest")
      .then(({ data }) => setNotifications(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  // Mark a notification as read when clicked
  const markRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {}
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative text-gray-400 hover:text-mayden-magenta transition-colors"
      >
        <Bell size={18} />
        {/* Badge showing unread notification count */}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-mayden-magenta text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-100 shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-semibold text-sm text-mayden-dark">Notifications</h3>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-mayden-magenta border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No notifications yet</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50 last:border-0 transition-colors ${!n.read ? "bg-mayden-magenta/5" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    <Bell size={12} className={`mt-0.5 flex-shrink-0 ${!n.read ? "text-mayden-magenta" : "text-gray-400"}`} />
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${!n.read ? "text-mayden-dark" : "text-gray-600"}`}>{n.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.body}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(n.sentAt).toLocaleString()}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 bg-mayden-magenta rounded-full mt-1.5 flex-shrink-0" />}
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

// Main subscriber layout with header, nav tabs, and content area
export default function SubscriberLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Top navigation tabs
  const nav = [
    { to: "/dashboard", label: "Home", icon: Home },
    { to: "/library", label: "Library", icon: Library },
    { to: "/subscription", label: "Subscription", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-mayden-gray">
      {/* Sticky header with logo, notification bell, greeting, logout */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard">
            <LogoLockup orientation="horizontal" />
          </Link>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <span className="text-sm text-gray-500">Hi, {user?.fullName?.split(" ")[0]}</span>
            <button onClick={logout} className="text-gray-400 hover:text-mayden-magenta transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Tabbed navigation — active tab gets magenta background */}
        <nav className="flex gap-1 mb-6 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
          {nav.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-mayden-magenta text-white" : "text-gray-500 hover:text-mayden-magenta"
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {children}
      </div>
    </div>
  );
}
