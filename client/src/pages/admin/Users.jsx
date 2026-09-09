import { startTransition, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Search, Filter, Eye, Trash2, Headphones } from "lucide-react";
import AdminPageHeading from "../../components/admin/AdminPageHeading";
import AdminTable from "../../components/admin/AdminTable";
import ConfirmModal from "../../components/admin/ConfirmModal";
import StatusBadge from "../../components/admin/StatusBadge";
import { InlineLoader } from "../../components/admin/Loader";
import { useToast } from "../../components/admin/useToast.js";

const STATUS_FILTERS = [
  { value: "", label: "All Users" },
  { value: "active", label: "Active" },
  { value: "cancelled", label: "Cancelled" },
  { value: "past_due", label: "Past Due" },
  { value: "never_subscribed", label: "Never Subscribed" },
];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    startTransition(() => setLoading(true));
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
      toast("User deleted.");
    } catch (err) {
      toast(err.response?.data?.error || "Failed to delete user.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeading title="Users" subtitle="Every account, their subscription state and activity." />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-mayden-magenta focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-mayden-magenta focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      <AdminTable
        columns={[
          { label: "User" },
          { label: "Status" },
          { label: "Plan" },
          { label: "Next Billing" },
          { label: "Last Active" },
          { label: "Listens" },
          { label: "Action", className: "text-right" },
        ]}
        empty="No users found"
      >
        {loading ? (
          <tr>
            <td colSpan={7} className="py-12 text-center"><InlineLoader /></td>
          </tr>
        ) : (
          users.map((u) => (
            <tr key={u.id} className="hover:bg-mayden-gray/40">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mayden-magenta/10 text-xs font-bold text-mayden-magenta">
                    {u.fullName?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-mayden-dark">{u.fullName}</p>
                    <p className="text-xs text-gray-400">{u.email || u.phone}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3"><StatusBadge status={u.subscription?.status || "none"} /></td>
              <td className="px-4 py-3 text-gray-500 capitalize">{u.subscription?.plan || "—"}</td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {u.subscription?.nextRenewal ? new Date(u.subscription.nextRenewal).toLocaleDateString() : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {u.lastActive ? new Date(u.lastActive).toLocaleDateString() : "—"}
              </td>
              <td className="px-4 py-3 text-gray-500">
                <span className="inline-flex items-center gap-1"><Headphones size={12} /> {u.episodesListened || 0}</span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => navigate(`/admin/users/${u.id}`)}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-200"
                  >
                    <Eye size={12} /> View
                  </button>
                  <button
                    onClick={() => setDeleteTarget(u)}
                    aria-label="Delete user"
                    className="rounded-full p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </AdminTable>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete User"
        message={deleteTarget ? `Permanently delete ${deleteTarget.fullName} and all their data (subscriptions, payments, listen history)?` : ""}
        confirmLabel="Delete User"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}