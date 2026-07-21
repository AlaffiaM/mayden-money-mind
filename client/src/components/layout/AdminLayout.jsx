// Admin layout — sidebar navigation with 6 sections + user profile + logout
// Wraps all admin page content in a responsive flex layout
import { useAuth } from "../../context/AuthContext";
import { LayoutDashboard, FileText, Users, CreditCard, Bell, Settings, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();

  // Navigation items — exact match for dashboard, prefix match for others
  const nav = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/episodes", label: "Episodes", icon: FileText },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
    { to: "/admin/notifications", label: "Notifications", icon: Bell },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ];

  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-mayden-dark text-white flex flex-col">
        {/* Logo + title */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <img src="/assets/logo.jpg" alt="M&m" className="w-8 h-8 object-contain rounded-full" />
            <h2 className="font-serif text-lg font-bold">Money & Mind</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">Admin Panel</p>
        </div>

        {/* Nav links — active item gets magenta background */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const active = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                  active ? "bg-mayden-magenta text-white" : "text-gray-300 hover:bg-white/10"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User profile + logout at bottom */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-mayden-magenta flex items-center justify-center text-xs font-bold">
              {user?.fullName?.charAt(0)}
            </div>
            <div className="text-sm">
              <p className="font-medium">{user?.fullName}</p>
              <p className="text-xs text-gray-400">Admin</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-full"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
