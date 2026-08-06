// Logout button — opens an in-app confirmation modal before clearing the session.
// Used in the subscriber header and the admin sidebar.
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { LogOut } from "lucide-react";

export default function LogoutButton({ className, children, ariaLabel }) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className={className} aria-label={ariaLabel}>
        {children}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center mb-3">
              <LogOut size={18} className="text-red-500" />
            </div>
            <h3 className="font-bold text-mayden-dark text-lg">Log out</h3>
            <p className="text-sm text-gray-500 mt-1">Are you sure you want to log out?</p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={logout}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
