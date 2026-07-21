// Admin user detail page — tabbed profile view with overview, subs, payments, activity
// Includes admin actions: force cancel subscription, delete user (with audit log)
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { ArrowLeft, Mail, Phone, Calendar, CreditCard, Shield, AlertTriangle, Headphones, Trash2 } from "lucide-react";

// Status badge color map for subscription and payment statuses
const STATUS_BADGE = {
  active: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  past_due: "bg-orange-100 text-orange-700",
  paused: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-600",
  expired: "bg-red-100 text-red-600",
  success: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-600",
};

const DAY_LABELS = {
  monday: "Motivation",
  tuesday: "Tactical",
  wednesday: "Wellness",
  thursday: "Testimonial",
  friday: "Financial",
};

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [overrideModal, setOverrideModal] = useState(null);
  const [reason, setReason] = useState("");
  const [overriding, setOverriding] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    api.get(`/admin/users/${id}`)
      .then(({ data }) => setUser(data))
      .catch(() => navigate("/admin/users"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleOverride = async () => {
    if (!overrideModal) return;
    setOverriding(true);
    try {
      if (overrideModal === "delete") {
        await api.delete(`/admin/users/${id}`);
        navigate("/admin/users", { replace: true });
        return;
      }
      await api.post(`/admin/users/${id}/override`, { action: overrideModal, reason: reason || null });
      const { data } = await api.get(`/admin/users/${id}`);
      setUser(data);
      setOverrideModal(null);
      setReason("");
    } catch {
      // keep current state
    } finally {
      setOverriding(false);
    }
  };

  const refreshUser = () => {
    api.get(`/admin/users/${id}`).then(({ data }) => setUser(data)).catch(() => {});
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-mayden-magenta border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const sub = user.subscriptions?.[0] || null;
  const payments = user.payments || [];
  const listenLogs = user.listenLogs || [];
  const subHistory = user.subscriptions || [];

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/admin/users")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-mayden-dark transition-colors">
        <ArrowLeft size={16} /> Back to Users
      </button>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-mayden-magenta/10 flex items-center justify-center text-xl font-bold text-mayden-magenta">
              {user.fullName?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-mayden-dark">{user.fullName}</h1>
              <p className="text-sm text-gray-500">Registered {new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[sub?.status] || "bg-gray-100 text-gray-500"}`}>
            {sub?.status || "no subscription"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600"><Mail size={14} className="text-gray-400" /> {user.email || "No email"}</div>
          <div className="flex items-center gap-2 text-sm text-gray-600"><Phone size={14} className="text-gray-400" /> {user.phone || "No phone"}</div>
          <div className="flex items-center gap-2 text-sm text-gray-600"><Shield size={14} className="text-gray-400" /> {user.role}</div>
          <div className="flex items-center gap-2 text-sm text-gray-600"><Headphones size={14} className="text-gray-400" /> {listenLogs.length} episodes listened</div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
          {sub && sub.status !== "cancelled" && (
            <button onClick={() => setOverrideModal("cancel")} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">
              Force Cancel
            </button>
          )}
          <button onClick={() => setOverrideModal("delete")} className="px-4 py-2 rounded-lg border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-1.5">
            <Trash2 size={14} /> Delete User
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {["overview", "subscriptions", "payments", "activity"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${activeTab === tab ? "bg-white text-mayden-dark shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && sub && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-mayden-dark mb-4">Current Subscription</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div><p className="text-xs text-gray-500 mb-1">Plan</p><p className="font-medium capitalize">{sub.plan}</p></div>
            <div><p className="text-xs text-gray-500 mb-1">Status</p><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[sub.status]}`}>{sub.status}</span></div>
            <div><p className="text-xs text-gray-500 mb-1">Started</p><p className="font-medium">{new Date(sub.startDate).toLocaleDateString()}</p></div>
            <div><p className="text-xs text-gray-500 mb-1">Next Renewal</p><p className="font-medium">{sub.nextRenewal ? new Date(sub.nextRenewal).toLocaleDateString() : "—"}</p></div>
          </div>
        </div>
      )}

      {activeTab === "overview" && !sub && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
          <CreditCard size={32} className="mx-auto mb-2 opacity-50" />
          <p>No subscription found.</p>
        </div>
      )}

      {activeTab === "subscriptions" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h2 className="font-semibold text-mayden-dark">Subscription History</h2></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left p-4 font-medium text-gray-500">Plan</th>
                <th className="text-left p-4 font-medium text-gray-500">Status</th>
                <th className="text-left p-4 font-medium text-gray-500">Started</th>
                <th className="text-left p-4 font-medium text-gray-500">Next Renewal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subHistory.map((s) => (
                <tr key={s.id}>
                  <td className="p-4 capitalize">{s.plan}</td>
                  <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[s.status]}`}>{s.status}</span></td>
                  <td className="p-4 text-gray-500">{new Date(s.startDate).toLocaleDateString()}</td>
                  <td className="p-4 text-gray-500">{s.nextRenewal ? new Date(s.nextRenewal).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
              {subHistory.length === 0 && <tr><td colSpan={4} className="text-center text-gray-400 py-8">No subscriptions</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "payments" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h2 className="font-semibold text-mayden-dark">Payment History</h2></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left p-4 font-medium text-gray-500">Date</th>
                <th className="text-left p-4 font-medium text-gray-500">Amount</th>
                <th className="text-left p-4 font-medium text-gray-500">Status</th>
                <th className="text-left p-4 font-medium text-gray-500">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="p-4 text-gray-600">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="p-4 font-medium">{p.amount === 0 ? "Manual" : `₦${p.amount.toLocaleString()}`}</td>
                  <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[p.status]}`}>{p.status}</span></td>
                  <td className="p-4 text-gray-500 font-mono text-xs">{p.reference}</td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={4} className="text-center text-gray-400 py-8">No payments</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h2 className="font-semibold text-mayden-dark">Episode Listening Activity</h2></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left p-4 font-medium text-gray-500">Episode</th>
                <th className="text-left p-4 font-medium text-gray-500">Day Type</th>
                <th className="text-left p-4 font-medium text-gray-500">Listened At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {listenLogs.map((log) => (
                <tr key={log.id}>
                  <td className="p-4 font-medium text-mayden-dark">{log.episode?.title || "—"}</td>
                  <td className="p-4"><span className="text-xs text-gray-500 capitalize">{DAY_LABELS[log.episode?.dayType] || log.episode?.dayType}</span></td>
                  <td className="p-4 text-gray-500 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {listenLogs.length === 0 && <tr><td colSpan={3} className="text-center text-gray-400 py-8">No listening activity</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Override Modal */}
      {overrideModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${overrideModal === "delete" ? "bg-red-100" : "bg-red-100"}`}>
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-mayden-dark">{overrideModal === "delete" ? "Delete User" : "Force Cancel"}</h3>
                <p className="text-xs text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {overrideModal === "delete"
                ? `Permanently delete ${user.fullName} and all their data (subscriptions, payments, listen history)?`
                : `Cancel ${user.fullName}'s subscription immediately?`}
            </p>
            {overrideModal !== "delete" && (
              <input type="text" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20" />
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setOverrideModal(null); setReason(""); }} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onClick={handleOverride} disabled={overriding} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50">
                {overriding ? "Processing..." : overrideModal === "delete" ? "Delete User" : "Cancel Subscription"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
