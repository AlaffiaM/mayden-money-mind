import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  FileText,
  Users,
  CreditCard,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import LogoutButton from "../ui/LogoutButton";
import { ToastProvider } from "../admin/useToast";

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/episodes", label: "Episodes", icon: FileText },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function SidebarContent({ onNavigate }) {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <>
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <img src="/assets/logo.jpg" alt="Money & Mind" className="h-8 w-8 rounded-full object-contain" />
          <div>
            <h2 className="font-serif text-lg font-bold leading-tight">Money &amp; Mind</h2>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {nav.map((item) => {
          const active = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                active ? "bg-mayden-magenta text-white shadow-lg shadow-mayden-magenta/20" : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mayden-magenta text-xs font-bold text-white">
            {user?.fullName?.charAt(0)}
          </div>
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium text-white">{user?.fullName}</p>
            <p className="text-xs text-gray-400">Admin</p>
          </div>
        </div>
        <LogoutButton className="flex w-full items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white">
          <LogOut size={16} /> Logout
        </LogoutButton>
      </div>
    </>
  );
}

export default function AdminLayout({ children }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="min-h-screen bg-mayden-gray lg:flex">
      <header className="sticky top-0 z-40 flex items-center justify-between bg-mayden-dark px-4 py-3 text-white lg:hidden">
        <div className="flex items-center gap-2">
          <img src="/assets/logo.jpg" alt="Money & Mind" className="h-7 w-7 rounded-full object-contain" />
          <span className="font-serif text-base font-bold">Money &amp; Mind</span>
          <span className="text-xs text-gray-400">— Admin</span>
        </div>
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-2 text-gray-300 hover:bg-white/10">
          <Menu size={20} />
        </button>
      </header>

      <aside className="hidden w-64 flex-col bg-mayden-dark text-white lg:flex">
        <SidebarContent />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={close} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-mayden-dark text-white shadow-2xl">
            <button
              onClick={close}
              aria-label="Close menu"
              className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
            >
              <X size={20} />
            </button>
            <SidebarContent onNavigate={close} />
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1 overflow-auto">
        <ToastProvider>
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</div>
        </ToastProvider>
      </main>
    </div>
  );
}