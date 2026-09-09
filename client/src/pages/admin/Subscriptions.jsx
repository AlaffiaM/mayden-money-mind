import { useState, useEffect, useMemo } from "react";
import api from "../../services/api";
import { Download, CreditCard, CheckCircle, AlertTriangle } from "lucide-react";
import AdminPageHeading from "../../components/admin/AdminPageHeading";
import AdminStatCard from "../../components/admin/AdminStatCard";
import AdminTable from "../../components/admin/AdminTable";
import StatusBadge from "../../components/admin/StatusBadge";
import { downloadCsv } from "../../utils/csv";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "past_due", label: "Past Due" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];

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

  const activeSubscriptions = subscriptions.filter((s) => s.status === "active").length;
  const expiredSubscriptions = subscriptions.filter((s) => s.status === "expired").length;
  const totalRevenue = subscriptions.reduce((sum, s) => sum + (s.amount || 0), 0);

  const handleExport = () => {
    downloadCsv(
      subscriptions.map((s) => ({
        "User ID": s.userId,
        "Full Name": s.user?.fullName || "",
        Email: s.user?.email || "",
        Phone: s.user?.phone || "",
        Plan: s.plan,
        Status: s.status,
        "Start Date": s.startDate ? new Date(s.startDate).toLocaleDateString() : "",
        "Next Renewal": s.nextRenewal ? new Date(s.nextRenewal).toLocaleDateString() : "",
        "Last Payment Amount": s.amount || 0,
      })),
      `subscriptions-export-${new Date().toISOString().split("T")[0]}.csv`
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeading
        title="Subscriptions"
        subtitle="All plans, their owners and renewal state."
        actions={
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-mayden-gray"
          >
            <Download size={16} /> Export CSV
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminStatCard label="Total Revenue" value={`₦${totalRevenue.toLocaleString()}`} icon={CreditCard} tone="emerald" />
        <AdminStatCard label="Active Subscriptions" value={activeSubscriptions} icon={CheckCircle} tone="emerald" />
        <AdminStatCard label="Expired Subscriptions" value={expiredSubscriptions} icon={AlertTriangle} tone="red" />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-500">Filter by status</label>
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

      <AdminTable
        columns={[
          { label: "User" },
          { label: "Email" },
          { label: "Phone" },
          { label: "Plan" },
          { label: "Status" },
          { label: "Start Date" },
          { label: "Next Renewal" },
          { label: "Last Payment" },
        ]}
        empty="No subscriptions found"
      >
        {loading ? (
          <tr>
            <td colSpan={8} className="py-12 text-center"><div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-mayden-magenta border-t-transparent" /></td>
          </tr>
        ) : (
          filteredSubscriptions.map((s) => (
            <tr key={s.id} className="hover:bg-mayden-gray/40">
              <td className="px-4 py-3">
                <p className="font-medium text-mayden-dark">{s.user?.fullName}</p>
                <p className="text-xs text-gray-400">{s.userId}</p>
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">{s.user?.email || "—"}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{s.user?.phone || "—"}</td>
              <td className="px-4 py-3 capitalize text-gray-500">{s.plan}</td>
              <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
              <td className="px-4 py-3 text-xs text-gray-500">{s.startDate ? new Date(s.startDate).toLocaleDateString() : "—"}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{s.nextRenewal ? new Date(s.nextRenewal).toLocaleDateString() : "—"}</td>
              <td className="px-4 py-3 font-medium text-gray-500">₦{(s.amount || 0).toLocaleString()}</td>
            </tr>
          ))
        )}
      </AdminTable>
    </div>
  );
}