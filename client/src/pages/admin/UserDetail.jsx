import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  ArrowLeft,
  Mail,
  Phone,
  CreditCard,
  Shield,
  AlertTriangle,
  Headphones,
} from "lucide-react";
import AdminPageHeading from "../../components/admin/AdminPageHeading";
import AdminCard from "../../components/admin/AdminCard";
import StatusBadge from "../../components/admin/StatusBadge";
import AdminTable from "../../components/admin/AdminTable";
import Loader from "../../components/admin/Loader";
import { useToast } from "../../components/admin/useToast.js";
import LoadError from "../../components/ui/LoadError";

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
  const [loadError, setLoadError] = useState(false);
  const [overrideModal, setOverrideModal] = useState(null);
  const [reason, setReason] = useState("");
  const [overriding, setOverriding] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const toast = useToast();

  const loadUser = useCallback(() => {
    api
      .get(`/admin/users/${id}`)
      .then(({ data }) => {
        setUser(data);
        setLoadError(false);
      })
      .catch((error) => {
        if (error.response?.status === 404) {
          navigate("/admin/users", { replace: true });
          return;
        }
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const retryUser = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    loadUser();
  }, [loadUser]);

  const handleOverride = async () => {
    if (!overrideModal) return;
    setOverriding(true);
    try {
      if (overrideModal === "delete") {
        await api.delete(`/admin/users/${id}`);
        toast("User deleted.");
        navigate("/admin/users", { replace: true });
        return;
      }
      await api.post(`/admin/users/${id}/override`, {
        action: overrideModal,
        reason: reason || null,
      });
      const { data } = await api.get(`/admin/users/${id}`);
      setUser(data);
      setOverrideModal(null);
      setReason("");
      toast("Subscription updated.");
    } catch (err) {
      toast(err.response?.data?.error || "Something went wrong.", "error");
    } finally {
      setOverriding(false);
    }
  };

  if (loading) return <Loader label="Loading user…" />;
  if (loadError)
    return (
      <div className="space-y-4">
        <LoadError
          message="This user's details couldn't be loaded."
          onRetry={retryUser}
        />
        <button
          onClick={() => navigate("/admin/users")}
          className="text-sm font-medium text-mayden-magenta hover:underline"
        >
          Back to users
        </button>
      </div>
    );
  if (!user) return null;

  const sub = user.subscriptions?.[0] || null;
  const payments = user.payments || [];
  const listenLogs = user.listenLogs || [];
  const subHistory = user.subscriptions || [];

  return (
    <div className="space-y-6">
      <AdminPageHeading
        title={user.fullName}
        subtitle={`Registered ${new Date(user.createdAt).toLocaleDateString()}`}
        actions={
          <>
            <StatusBadge
              status={sub?.status || "none"}
              label={sub?.status || "no subscription"}
            />
            <button
              onClick={() => navigate("/admin/users")}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-mayden-dark"
            >
              <ArrowLeft size={15} /> Back to Users
            </button>
          </>
        }
      />

      <AdminCard title="Account details">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail size={14} className="text-gray-400" />{" "}
            {user.email || "No email"}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone size={14} className="text-gray-400" />{" "}
            {user.phone || "No WhatsApp number"}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Shield size={14} className="text-gray-400" /> {user.role}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Headphones size={14} className="text-gray-400" />{" "}
            {listenLogs.length} episodes listened to
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3 border-t border-gray-100 pt-4">
          {sub && sub.status !== "cancelled" && (
            <button
              onClick={() => setOverrideModal("cancel")}
              className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
            >
              Cancel subscription now
            </button>
          )}
          <button
            onClick={() => setOverrideModal("delete")}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
          >
            <AlertTriangle size={14} /> Delete User
          </button>
        </div>
      </AdminCard>

      <div
        className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200/80 bg-white p-1 shadow-[0_2px_8px_rgba(26,26,26,0.03)]"
      >
        {["overview", "subscriptions", "payments", "activity"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            type="button"
            aria-pressed={activeTab === tab}
            className={`min-w-max flex-1 rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? "bg-mayden-pink-tint text-mayden-magenta"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "overview" && sub && (
        <AdminCard title="Current Subscription">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="mb-1 text-xs text-gray-500">Plan</p>
              <p className="font-medium capitalize">{sub.plan}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500">Status</p>
              <StatusBadge status={sub.status} />
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500">Started</p>
              <p className="font-medium">
                {new Date(sub.startDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500">Next Renewal</p>
              <p className="font-medium">
                {sub.nextRenewal
                  ? new Date(sub.nextRenewal).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>
        </AdminCard>
      )}

      {activeTab === "overview" && !sub && (
        <AdminCard className="p-12 text-center text-gray-400 sm:p-12">
          <CreditCard size={32} className="mx-auto mb-2 opacity-50" />
          <p>No subscription found.</p>
        </AdminCard>
      )}

      {activeTab === "subscriptions" && (
        <AdminCard title="Subscription History">
          <AdminTable
            columns={[
              { label: "Plan" },
              { label: "Status" },
              { label: "Started" },
              { label: "Next Renewal" },
            ]}
            empty="No subscriptions"
          >
            {subHistory.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 capitalize">{s.plan}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={s.status} />
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(s.startDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {s.nextRenewal
                    ? new Date(s.nextRenewal).toLocaleDateString()
                    : "—"}
                </td>
              </tr>
            ))}
          </AdminTable>
        </AdminCard>
      )}

      {activeTab === "payments" && (
        <AdminCard title="Payment History">
          <AdminTable
            columns={[
              { label: "Date" },
              { label: "Amount" },
              { label: "Status" },
              { label: "Reference" },
            ]}
            empty="No payments"
          >
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 text-gray-600">
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 font-medium">
                  {p.amount === 0 ? "Manual" : `₦${p.amount.toLocaleString()}`}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {p.reference}
                </td>
              </tr>
            ))}
          </AdminTable>
        </AdminCard>
      )}

      {activeTab === "activity" && (
        <AdminCard title="Episode Listening Activity">
          <AdminTable
            columns={[
              { label: "Episode" },
              { label: "Day Type" },
              { label: "Listened At" },
            ]}
            empty="No listening activity"
          >
            {listenLogs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3 font-medium text-mayden-dark">
                  {log.episode?.title || "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs capitalize text-gray-500">
                    {DAY_LABELS[log.episode?.dayType] || log.episode?.dayType}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </AdminTable>
        </AdminCard>
      )}

      {overrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-mayden-dark">
                  {overrideModal === "delete"
                    ? "Delete User"
                    : "Cancel Subscription"}
                </h3>
                <p className="text-xs text-gray-500">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              {overrideModal === "delete"
                ? `Permanently delete ${user.fullName} and all their data (subscriptions, payments, listen history)?`
                : `Cancel ${user.fullName}'s subscription immediately?`}
            </p>
            {overrideModal !== "delete" && (
              <input
                type="text"
                placeholder="Reason (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mb-4 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-mayden-magenta focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20"
              />
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setOverrideModal(null);
                  setReason("");
                }}
                className="rounded-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleOverride}
                disabled={overriding}
                className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {overriding
                  ? "Processing…"
                  : overrideModal === "delete"
                    ? "Delete User"
                    : "Cancel Subscription"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
