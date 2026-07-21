// Admin users page — searchable + filterable user table
// Clicking "View" navigates to the full user detail page with tabs
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Search, Filter, Eye, Trash2, Headphones } from "lucide-react";

// Subscription status filter options for the dropdown
const STATUS_FILTERS = [
  { value: "", label: "All Users" },
  { value: "active", label: "Active" },
  { value: "cancelled", label: "Cancelled" },
  { value: "past_due", label: "Past Due" },
  { value: "never_subscribed", label: "Never Subscribed" },
];

const STATUS_BADGE = {
  active: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  past_due: "bg-orange-100 text-orange-700",
  paused: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-600",
  expired: "bg-red-100 text-red-600",
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (statusFilter) params.status = statusFilter;
    api.get("/admin/users", { params })
      .then(({ data }) => setUsers(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [debouncedSearch, statusFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/admin/users/${deleteTarget.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // keep current state
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-mayden-dark">Users</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20 focus:border-mayden-magenta"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left p-4 font-medium text-gray-500">User</th>
              <th className="text-left p-4 font-medium text-gray-500">Status</th>
              <th className="text-left p-4 font-medium text-gray-500">Plan</th>
              <th className="text-left p-4 font-medium text-gray-500">Next Billing</th>
              <th className="text-left p-4 font-medium text-gray-500">Last Active</th>
              <th className="text-left p-4 font-medium text-gray-500">Listens</th>
              <th className="text-right p-4 font-medium text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12"><div className="w-6 h-6 border-2 border-mayden-magenta border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-gray-400 py-12">No users found</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-mayden-magenta/10 flex items-center justify-center text-xs font-bold text-mayden-magenta">
                        {u.fullName?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-mayden-dark">{u.fullName}</p>
                        <p className="text-xs text-gray-400">{u.email || u.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[u.subscription?.status] || "bg-gray-100 text-gray-500"}`}>
                      {u.subscription?.status || "none"}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500 capitalize">{u.subscription?.plan || "—"}</td>
                  <td className="p-4 text-gray-500 text-xs">
                    {u.subscription?.nextRenewal ? new Date(u.subscription.nextRenewal).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-4 text-gray-500 text-xs">
                    {u.lastActive ? new Date(u.lastActive).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-4 text-gray-500 flex items-center gap-1">
                    <Headphones size={12} /> {u.episodesListened || 0}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/admin/users/${u.id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200"
                      >
                        <Eye size={12} /> View
                      </button>
                      <button
                        onClick={() => setDeleteTarget(u)}
                        className="flex items-center gap-1 px-3 py-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 text-xs rounded-lg transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-mayden-dark">Delete User</h3>
                <p className="text-xs text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Permanently delete <strong>{deleteTarget.fullName}</strong> and all their data (subscriptions, payments, listen history)?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600">Delete User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
