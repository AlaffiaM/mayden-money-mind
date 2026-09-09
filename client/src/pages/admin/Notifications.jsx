import { useState, useEffect } from "react";
import api from "../../services/api";
import { Send, Bell, Clock, CheckCircle, Trash2 } from "lucide-react";
import AdminPageHeading from "../../components/admin/AdminPageHeading";
import AdminCard from "../../components/admin/AdminCard";
import ConfirmModal from "../../components/admin/ConfirmModal";
import Loader from "../../components/admin/Loader";
import { useToast } from "../../components/admin/useToast.js";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api
      .get("/admin/notifications")
      .then(({ data }) => setNotifications(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setSent(false);
    try {
      await api.post("/admin/notifications", {
        title,
        body,
        channels: "inapp",
      });
      setSent(true);
      setTitle("");
      setBody("");
      api
        .get("/admin/notifications")
        .then(({ data }) => setNotifications(data));
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      toast(err.response?.data?.error || "Failed to send", "error");
    } finally {
      setSending(false);
    }
  };

  const handleTest = async () => {
    if (!title.trim() || !body.trim()) return;
    try {
      const { data } = await api.post("/admin/notifications/test", {
        title,
        body,
        channels: "inapp",
      });
      setTestResult(data.preview);
      setTimeout(() => setTestResult(null), 3000);
    } catch (err) {
      toast(err.response?.data?.error || "Failed to send test", "error");
    }
  };

  const handleDeleteOne = async (id) => {
    try {
      await api.delete(`/admin/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      toast(err.response?.data?.error || "Failed to delete", "error");
    }
  };

  const handleClearAll = async () => {
    try {
      await api.delete("/admin/notifications");
      setNotifications([]);
      setConfirmClearAll(false);
      toast("All notifications cleared.");
    } catch (err) {
      toast(err.response?.data?.error || "Failed to clear", "error");
      setConfirmClearAll(false);
    }
  };

  if (loading) return <Loader label="Loading notifications…" />;

  const inputClass =
    "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-mayden-magenta focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20";

  return (
    <div className="space-y-6">
      <AdminPageHeading
        title="Notifications"
        subtitle="Compose in-app notifications and review what has been sent."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminCard title="Compose Notification">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title..."
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Message
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="Write your notification message..."
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="rounded-xl border border-gray-100 bg-mayden-gray/60 p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">
                Preview
              </p>
              <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                <div className="mb-1 flex items-center gap-2">
                  <Bell size={12} className="text-mayden-magenta" />
                  <p className="text-sm font-semibold text-mayden-dark">
                    {title || "Notification Title"}
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  {body || "Your notification message will appear here..."}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSend}
                disabled={sending || !title.trim() || !body.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-mayden-magenta px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-mayden-magenta/90 disabled:opacity-50"
              >
                <Send size={14} /> {sending ? "Sending…" : "Send now"}
              </button>
              <button
                onClick={handleTest}
                disabled={!title.trim() || !body.trim()}
                className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition-colors hover:bg-mayden-gray disabled:opacity-50"
              >
                Send Test to Me
              </button>
            </div>

            {sent && (
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                <CheckCircle size={16} /> Notification sent!
              </div>
            )}
            {testResult && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                Test preview sent: "{testResult.title}" via{" "}
                {testResult.channels}
              </div>
            )}
          </div>
        </AdminCard>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 bg-mayden-gray/60 px-5 py-4">
            <h2 className="font-serif font-bold text-mayden-dark">
              Notification History
            </h2>
            {notifications.length > 0 && (
              <button
                onClick={() => setConfirmClearAll(true)}
                className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-red-400 transition-colors hover:text-red-600"
              >
                <Trash2 size={12} /> Clear All
              </button>
            )}
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="py-12 text-center text-gray-400">
                No notifications sent yet
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((n) => (
                  <div key={n.id} className="group p-4 hover:bg-mayden-gray/40">
                    <div className="mb-1 flex items-start justify-between">
                      <p className="text-sm font-medium text-mayden-dark">
                        {n.title}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={10} />{" "}
                          {new Date(n.sentAt).toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleDeleteOne(n.id)}
                          className="text-gray-300 opacity-0 transition-colors hover:text-red-500 group-hover:opacity-100"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <p className="mb-2 line-clamp-2 text-xs text-gray-500">
                      {n.body}
                    </p>
                    <div className="flex items-center gap-2">
                      {n.channels.split(",").map((ch) => (
                        <span
                          key={ch}
                          className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-500"
                        >
                          {ch}
                        </span>
                      ))}
                      <span className="text-[10px] text-gray-400">
                        by {n.sentBy}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmClearAll}
        title="Clear All Notifications"
        message="Delete all notification history? This cannot be undone."
        confirmLabel="Delete All"
        onConfirm={handleClearAll}
        onCancel={() => setConfirmClearAll(false)}
      />
    </div>
  );
}
