import { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import { Send, Bell, Clock, CheckCircle, Trash2, Mail } from "lucide-react";
import AdminPageHeading from "../../components/admin/AdminPageHeading";
import AdminCard from "../../components/admin/AdminCard";
import ConfirmModal from "../../components/admin/ConfirmModal";
import Loader from "../../components/admin/Loader";
import { useToast } from "../../components/admin/useToast.js";
import LoadError from "../../components/ui/LoadError";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channels, setChannels] = useState(["inapp"]);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const toast = useToast();

  const loadNotifications = useCallback(() => {
    api
      .get("/admin/notifications")
      .then(({ data }) => {
        setNotifications(data);
        setLoadError(false);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const retryNotifications = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    loadNotifications();
  }, [loadNotifications]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim() || channels.length === 0) return;
    setConfirmSend(true);
  };

  const confirmNotificationSend = async () => {
    if (!title.trim() || !body.trim() || channels.length === 0) return;
    setSending(true);
    setSendResult("");
    try {
      const { data } = await api.post("/admin/notifications", {
        title,
        body,
        channels: channels.join(","),
      });
      const results = [];
      if (channels.includes("inapp")) {
        results.push("In-app notification sent to all users.");
      }
      if (channels.includes("email")) {
        results.push(
          `Email sent to ${data.recipients.emailSent} verified user(s)` +
            (data.recipients.emailFailed
              ? `; ${data.recipients.emailFailed} failed.`
              : "."),
        );
      }
      setSendResult(results.join(" "));
      setTitle("");
      setBody("");
      loadNotifications();
      setConfirmSend(false);
      setTimeout(() => setSendResult(""), 8000);
    } catch (err) {
      toast(err.response?.data?.error || "Failed to send", "error");
    } finally {
      setSending(false);
      setConfirmSend(false);
    }
  };

  const handleTest = async () => {
    if (!title.trim() || !body.trim() || channels.length === 0) return;
    try {
      const { data } = await api.post("/admin/notifications/test", {
        title,
        body,
        channels: channels.join(","),
      });
      setTestResult(data.message);
      setTimeout(() => setTestResult(null), 5000);
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
  const toggleChannel = (channel) => {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((selected) => selected !== channel)
        : [...current, channel],
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeading
        title="Notifications"
        subtitle="Send branded in-app notifications and emails to your users."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminCard title="Compose Notification">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                maxLength={120}
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
                maxLength={5000}
                placeholder="Write your notification message..."
                className={`${inputClass} resize-none`}
              />
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-gray-700">
                Send via
              </legend>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "inapp", label: "In-app notification", Icon: Bell },
                  { id: "email", label: "Email", Icon: Mail },
                ].map(({ id, label, Icon }) => {
                  const selected = channels.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleChannel(id)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors ${
                        selected
                          ? "border-mayden-magenta bg-mayden-magenta/10 text-mayden-magenta"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                In-app messages reach all accounts. Email goes to users with a
                verified email address. You can select either or both.
              </p>
            </fieldset>

            <div className="rounded-xl border border-gray-100 bg-mayden-gray/60 p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">
                Preview
              </p>
              <div className="space-y-3">
                {channels.includes("inapp") && (
                  <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                    <div className="mb-1 flex items-center gap-2">
                      <Bell size={12} className="text-mayden-magenta" />
                      <p className="text-sm font-semibold text-mayden-dark">
                        {title || "Notification title"}
                      </p>
                    </div>
                    <p className="whitespace-pre-wrap text-xs text-gray-500">
                      {body || "Your notification message will appear here..."}
                    </p>
                  </div>
                )}
                {channels.includes("email") && (
                  <div className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm">
                    <img
                      src="/assets/logo.jpg"
                      alt="Money & Mind"
                      className="mx-auto mb-2 h-10 w-10 rounded-full object-cover"
                    />
                    <p className="font-serif font-bold text-mayden-dark">
                      Money <span className="text-mayden-magenta">&amp;</span>{" "}
                      Mind
                    </p>
                    <p className="my-3 inline-block rounded-full border border-pink-200 bg-pink-50 px-4 py-1 text-sm font-medium text-mayden-dark">
                      {title || "Email subject"}
                    </p>
                    <p className="whitespace-pre-wrap text-left text-sm leading-relaxed text-gray-600">
                      {body || "Your email message will appear here..."}
                    </p>
                  </div>
                )}
                {channels.length === 0 && (
                  <p className="text-sm text-amber-700">
                    Select at least one delivery channel.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSend}
                disabled={sending || !title.trim() || !body.trim() || channels.length === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-mayden-magenta px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-mayden-magenta/90 disabled:opacity-50"
              >
                <Send size={14} />{" "}
                {sending ? "Sending…" : "Send to all users"}
              </button>
              <button
                onClick={handleTest}
                disabled={!title.trim() || !body.trim() || channels.length === 0}
                className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition-colors hover:bg-mayden-gray disabled:opacity-50"
              >
                {channels.includes("email")
                  ? channels.includes("inapp")
                    ? "Test Email + Preview"
                    : "Send Test Email"
                  : "Preview In-App"}
              </button>
            </div>

            {sendResult && (
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                <CheckCircle size={16} /> {sendResult}
              </div>
            )}
            {testResult && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                {testResult}
              </div>
            )}
          </div>
        </AdminCard>

        <AdminCard
          title="Notification History"
          actions={
            notifications.length > 0 && (
              <button
                onClick={() => setConfirmClearAll(true)}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={12} /> Clear All
              </button>
            )
          }
        >
          <div className="max-h-150 overflow-y-auto">
            {notifications.length === 0 ? (
              loadError ? (
                <div className="p-4">
                  <LoadError
                    message="Couldn't load notification history. Check your connection and try again."
                    onRetry={retryNotifications}
                  />
                </div>
              ) : (
                <p className="py-12 text-center text-gray-400">
                  No notifications sent yet
                </p>
              )
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
        </AdminCard>
      </div>

      <ConfirmModal
        open={confirmSend}
        title="Send this notification to all users?"
        message={`This will send via ${channels.join(" and ")}. Email will go to all users with verified email addresses.`}
        confirmLabel="Send notification"
        onConfirm={confirmNotificationSend}
        onCancel={() => setConfirmSend(false)}
        busy={sending}
      />
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
