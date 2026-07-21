// Admin subscriptions page — payment history table with CSV export + failed payment reminders
// Features: summary cards (revenue, failed, successful), tabbed view, bulk reminder actions
import { useState, useEffect, useMemo } from "react";
import api from "../../services/api";
import { Download, Send, Filter, AlertTriangle, CreditCard, CheckCircle, Clock, XCircle } from "lucide-react";

// Status badge color map
const STATUS_BADGE = {
  active: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  past_due: "bg-orange-100 text-orange-700",
  cancelled: "bg-gray-100 text-gray-600",
  expired: "bg-red-100 text-red-600",
  success: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-600",
};

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "past_due", label: "Past Due" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];

function exportCSV(payments) {
  const headers = ["Date", "User", "Email", "Amount", "Plan", "Reference", "Status"];
  const rows = payments.map((p) => [
    new Date(p.createdAt).toLocaleDateString(),
    p.user?.fullName || "",
    p.user?.email || "",
    p.amount,
    p.subscription?.plan || "",
    p.reference,
    p.status,
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
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedFailed, setSelectedFailed] = useState([]);
  const [sending, setSending] = useState(false);
  const [view, setView] = useState("payments");

  useEffect(() => {
    api.get("/admin/subscriptions/revenue")
      .then(({ data }) => setPayments(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const failedPayments = useMemo(() => payments.filter((p) => p.status === "failed"), [payments]);

  const filteredPayments = useMemo(() => {
    if (!statusFilter) return payments;
    return payments.filter((p) => p.status === statusFilter);
  }, [payments, statusFilter]);

  const totalRevenue = useMemo(() => payments.filter((p) => p.status === "success").reduce((s, p) => s + p.amount, 0), [payments]);

  const toggleFailedSelection = (id) => {
    setSelectedFailed((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const sendReminders = async () => {
    if (selectedFailed.length === 0) return;
    setSending(true);
    try {
      await api.post("/admin/subscriptions/send-reminder", { paymentIds: selectedFailed });
      setSelectedFailed([]);
      alert("Reminders sent successfully");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to send reminders");
    } finally {
      setSending(false);
    }
  };

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
        <button onClick={() => exportCSV(payments)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
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
            <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center"><AlertTriangle size={20} className="text-white" /></div>
            <p className="text-sm text-gray-500">Failed Payments</p>
          </div>
          <p className="text-2xl font-bold text-mayden-dark">{failedPayments.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center"><CheckCircle size={20} className="text-white" /></div>
            <p className="text-sm text-gray-500">Successful</p>
          </div>
          <p className="text-2xl font-bold text-mayden-dark">{payments.filter((p) => p.status === "success").length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setView("payments")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === "payments" ? "bg-white text-mayden-dark shadow-sm" : "text-gray-500"}`}>All Payments</button>
        <button onClick={() => setView("failed")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === "failed" ? "bg-white text-mayden-dark shadow-sm" : "text-gray-500"}`}>Failed ({failedPayments.length})</button>
      </div>

      {/* Failed Payments Bulk Actions */}
      {view === "failed" && selectedFailed.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-amber-800">{selectedFailed.length} payment(s) selected</p>
          <button onClick={sendReminders} disabled={sending} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50">
            <Send size={14} /> {sending ? "Sending..." : "Send Reminders"}
          </button>
        </div>
      )}

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-mayden-dark">{view === "failed" ? "Failed Payments" : "Payment History"}</h2>
          {view === "payments" && (
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-400" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs">
                {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {view === "failed" && <th className="p-4 w-10"><input type="checkbox" checked={selectedFailed.length === failedPayments.length && failedPayments.length > 0} onChange={() => setSelectedFailed(selectedFailed.length === failedPayments.length ? [] : failedPayments.map((p) => p.id))} className="rounded" /></th>}
                <th className="text-left p-4 font-medium text-gray-500">Date</th>
                <th className="text-left p-4 font-medium text-gray-500">User</th>
                <th className="text-left p-4 font-medium text-gray-500">Amount</th>
                <th className="text-left p-4 font-medium text-gray-500">Plan</th>
                <th className="text-left p-4 font-medium text-gray-500">Reference</th>
                <th className="text-left p-4 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(view === "failed" ? failedPayments : filteredPayments).map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  {view === "failed" && (
                    <td className="p-4"><input type="checkbox" checked={selectedFailed.includes(p.id)} onChange={() => toggleFailedSelection(p.id)} className="rounded" /></td>
                  )}
                  <td className="p-4 text-gray-500 text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <p className="font-medium text-mayden-dark">{p.user?.fullName}</p>
                    <p className="text-xs text-gray-400">{p.user?.email}</p>
                  </td>
                  <td className="p-4 font-medium">₦{p.amount.toLocaleString()}</td>
                  <td className="p-4 text-gray-500 capitalize">{p.subscription?.plan || "—"}</td>
                  <td className="p-4 text-gray-500 font-mono text-xs">{p.reference}</td>
                  <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[p.status]}`}>{p.status}</span></td>
                </tr>
              ))}
              {(view === "failed" ? failedPayments : filteredPayments).length === 0 && (
                <tr><td colSpan={view === "failed" ? 7 : 6} className="text-center text-gray-400 py-12">No payments found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
