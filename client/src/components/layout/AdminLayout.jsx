import { useState } from "react";
import { useAuth } from "../../context/useAuth";
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

const pageTitles = [
  { to: "/admin", title: "Dashboard", exact: true },
  { to: "/admin/episodes", title: "Episodes" },
  { to: "/admin/users", title: "Users" },
  { to: "/admin/subscriptions", title: "Subscriptions" },
  { to: "/admin/notifications", title: "Notifications" },
  { to: "/admin/settings", title: "Settings" },
];

const navGroups = [
  {
    label: "Overview",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Manage",
    items: [
      { to: "/admin/episodes", label: "Episodes", icon: FileText },
      { to: "/admin/users", label: "Users", icon: Users },
      { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
    ],
  },
  {
    label: "Communication",
    items: [{ to: "/admin/notifications", label: "Notifications", icon: Bell }],
  },
  {
    label: "System",
    items: [{ to: "/admin/settings", label: "Settings", icon: Settings }],
  },
];

function SidebarContent({ onNavigate }) {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <>
      <div className="border-b border-gray-100 px-5 py-6">
        <div className="flex items-center gap-2">
          <img
            src="/assets/logo.jpg"
            alt="Money & Mind"
            className="h-10 w-10 rounded-full object-contain ring-2 ring-mayden-pink-tint"
          />
          <div>
            <h2 className="font-serif text-base font-bold leading-tight text-mayden-dark">
              Money &amp; Mind
            </h2>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              Admin workspace
            </p>
          </div>
        </div>
      </div>

      <nav aria-label="Admin navigation" className="flex-1 space-y-6 overflow-y-auto p-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = item.exact
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-mayden-pink-tint text-mayden-magenta ring-1 ring-mayden-magenta/10"
                        : "text-gray-600 hover:bg-gray-50 hover:text-mayden-dark"
                    }`}
                  >
                    <item.icon size={17} strokeWidth={active ? 2.25 : 1.8} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-100 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mayden-magenta text-xs font-bold text-white">
            {user?.fullName?.charAt(0)}
          </div>
          <div className="min-w-0 text-sm">
            <p className="truncate font-semibold text-mayden-dark">{user?.fullName}</p>
            <p className="text-xs text-gray-500">Administrator</p>
          </div>
        </div>
        <LogoutButton className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600">
          <LogOut size={16} /> Logout
        </LogoutButton>
      </div>
    </>
  );
}

export default function AdminLayout({ children }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const location = useLocation();
  const currentPage =
    pageTitles.find((page) =>
      page.exact
        ? location.pathname === page.to
        : location.pathname.startsWith(page.to),
    )?.title || "Admin";

  return (
    <div className="min-h-screen bg-[#f5f6fa] lg:flex">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200/80 bg-white px-4 py-3 text-mayden-dark lg:hidden">
        <div className="flex items-center gap-2">
          <img
            src="/assets/logo.jpg"
            alt="Money & Mind"
            className="h-8 w-8 rounded-full object-contain"
          />
          <div>
            <p className="font-serif text-sm font-bold leading-tight">Money &amp; Mind</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Admin workspace</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="rounded-xl border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-50"
        >
          <Menu size={20} />
        </button>
      </header>

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-gray-200/80 bg-white lg:flex">
        <SidebarContent />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-mayden-dark/35 backdrop-blur-[2px]"
            onClick={close}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r border-gray-200 bg-white shadow-2xl">
            <button
              onClick={close}
              aria-label="Close menu"
              className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <X size={20} />
            </button>
            <SidebarContent onNavigate={close} />
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1">
        <div className="sticky top-0 z-30 hidden h-[4.25rem] items-center justify-between border-b border-gray-200/80 bg-white/90 px-8 backdrop-blur lg:flex">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
              Money &amp; Mind / Admin
            </p>
            <p className="mt-0.5 text-sm font-semibold text-mayden-dark">{currentPage}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Workspace
          </span>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
          {children}
        </div>
      </main>
    </div>
  );
}
