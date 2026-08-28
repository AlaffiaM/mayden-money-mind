// Admin subscriptions page — list of subscribers with CSV export
import { useState, useEffect, useMemo } from "react";
import api from "../../services/api";
import { Download, AlertTriangle, CreditCard, CheckCircle } from "lucide-react";

// Status badge color map
const STATUS_BADGE = {
  active: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  past_due: "bg-orange-100 text-orange-700",
  cancelled: "bg-gray-100 text-gray-600",
  expired: "bg-red-100 text-red-600",
};

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "past_due", label: "Past Due" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];

function exportCSV(subscriptions) {
  const headers = ["User ID", "Full Name", "Email", "Phone", "Plan", "Status", "Start Date", "Next Renewal", "Last Payment Amount"];
  const rows = subscriptions.map((s) => [
    s.userId,
    s.user?.fullName || "",
    s.user?.email || "",
    s.user?.phone || "",
    s.plan,
    s.status,
    s.startDate ? new Date(s.startDate).toLocaleDateString() : "",
    s.nextRenewal ? new Date(s.nextRenewal).toLocaleDateString() : "",
    s.amount || 0,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `subscriptions-export-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    api.get("/admin/subscriptions")
      .then(({ data }) => setSubscriptions(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredSubscriptions = useMemo(() => {
    if (!statusFilter) return subscriptions;
    return subscriptions.filter((s) => s.status === statusFilter);
  }, [subscriptions, statusFilter]);

  const totalSubscriptions = subscriptions.length;
  const activeSubscriptions = subscriptions.filter((s) => s.status === "active").length;
  const expiredSubscriptions = subscriptions.filter((s) => s.status === "expired").length;
  const totalRevenue = subscriptions.reduce((sum, s) => sum + (s.amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-mayden-magenta border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-mayden-dark">Subscriptions</h1>
        <button onClick={() => exportCSV(subscriptions)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center"><CreditCard size={20} className="text-white" /></div>
            <p className="text-sm text-gray-500">Total Revenue</p>
          </div>
          <p className="text-2xl font-bold text-mayden-dark">₦{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center"><CheckCircle size={20} className="text-white" /></div>
            <p className="text-sm text-gray-500">Active Subscriptions</p>
          </div>
          <p className="text-2xl font-bold text-mayden-dark">{activeSubscriptions}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center"><AlertTriangle size={20} className="text-white" /></div>
            <p className="text-sm text-gray-500">Expired Subscriptions</p>
          </div>
          <p className="text-2xl font-bold text-mayden-dark">{expiredSubscriptions}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium text-gray-500">Filter by status:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-mayden-dark">Subscriptions List</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-4 text-left font-medium text-gray-500">User ID</th>
                <th className="p-4 text-left font-medium text-gray-500">Full Name</th>
                <th className="p-4 text-left font-medium text-gray-500">Email</th>
                <th className="p-4 text-left font-medium text-gray-500">Phone</th>
                <th className="p-4 text-left font-medium text-gray-500">Plan</th>
                <th className="p-4 text-left font-medium text-gray-500">Status</th>
                <th className="p-4 text-left font-medium text-gray-500">Start Date</th>
                <th className="p-4 text-left font-medium text-gray-500">Next Renewal</th>
                <th className="p-4 text-left font-medium text-gray-500">Last Payment Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSubscriptions.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/50">
                  <td className="p-4 text-gray-500 text-xs">{s.userId}</td>
                  <td className="p-4">
                    <p className="font-medium text-mayden-dark">{s.user?.fullName}</p>
                    <p className="text-xs text-gray-400">{s.user?.email}</p>
                  </td>
                  <td className="p-4 text-gray-500 text-xs">{s.user?.email}</td>
                  <td className="p-4 text-gray-500 text-xs">{s.user?.phone || "—"}</td>
                  <td className="p-4 text-gray-500 capitalize">{s.plan}</td>
                  <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[s.status]}`}>{s.status}</span></td>
                  <td className="p-4 text-gray-500 text-xs">{s.startDate ? new Date(s.startDate).toLocaleDateString() : "—"}</td>
                  <td className="p-4 text-gray-500 text-xs">{s.nextRenewal ? new Date(s.nextRenewal).toLocaleDateString() : "—"}</td>
                  <td className="p-4 text-gray-500 font-medium">₦{(s.amount || 0).toLocaleString()}</td>
                </tr>
              ))}
              {filteredSubscriptions.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-gray-400 py-12">
                    No subscriptions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
