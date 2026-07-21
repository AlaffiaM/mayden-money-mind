// Admin notifications page — compose + send notifications with channel selection
// Features: live preview, send test to self, notification history with delete
import { useState, useEffect } from "react";
import api from "../../services/api";
import { Send, Bell, Smartphone, Mail, Clock, CheckCircle, Trash2 } from "lucide-react";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channels, setChannels] = useState({ inapp: true, email: false });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    api.get("/admin/notifications")
      .then(({ data }) => setNotifications(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getChannelString = () => {
    const ch = [];
    if (channels.inapp) ch.push("inapp");
    if (channels.email) ch.push("email");
    return ch.join(",") || "inapp";
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setSent(false);
    try {
      await api.post("/admin/notifications", { title, body, channels: getChannelString() });
      setSent(true);
      setTitle("");
      setBody("");
      api.get("/admin/notifications").then(({ data }) => setNotifications(data));
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleTest = async () => {
    if (!title.trim() || !body.trim()) return;
    try {
      const { data } = await api.post("/admin/notifications/test", { title, body, channels: getChannelString() });
      setTestResult(data.preview);
      setTimeout(() => setTestResult(null), 3000);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to send test");
    }
  };

  const handleDeleteOne = async (id) => {
    try {
      await api.delete(`/admin/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete");
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Delete all notification history? This cannot be undone.")) return;
    try {
      await api.delete("/admin/notifications");
      setNotifications([]);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to clear");
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
      <h1 className="text-2xl font-bold text-mayden-dark">Notifications</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Composer */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-mayden-dark mb-4">Compose Notification</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20 focus:border-mayden-magenta"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="Write your notification message..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mayden-magenta/20 focus:border-mayden-magenta resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Channels</label>
              <div className="flex gap-3">
                {[
                  { key: "inapp", label: "In-App", icon: Smartphone },
                  { key: "email", label: "Email", icon: Mail },
                ].map((ch) => (
                  <button
                    key={ch.key}
                    onClick={() => setChannels({ ...channels, [ch.key]: !channels[ch.key] })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                      channels[ch.key]
                        ? "bg-mayden-magenta/10 border-mayden-magenta text-mayden-magenta"
                        : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <ch.icon size={14} />
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Preview</p>
              <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Bell size={12} className="text-mayden-magenta" />
                  <p className="text-sm font-semibold text-mayden-dark">{title || "Notification Title"}</p>
                </div>
                <p className="text-xs text-gray-500">{body || "Your notification message will appear here..."}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSend}
                disabled={sending || !title.trim() || !body.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-mayden-magenta text-white rounded-lg text-sm font-medium hover:bg-mayden-magenta/90 disabled:opacity-50 transition-colors"
              >
                <Send size={14} /> {sending ? "Sending..." : "Send Now"}
              </button>
              <button
                onClick={handleTest}
                disabled={!title.trim() || !body.trim()}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Send Test to Me
              </button>
            </div>

            {sent && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                <CheckCircle size={16} /> Notification sent!
              </div>
            )}
            {testResult && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                Test preview sent: "{testResult.title}" via {testResult.channels}
              </div>
            )}
          </div>
        </div>

        {/* Notification History */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-mayden-dark">Notification History</h2>
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                <Trash2 size={12} /> Clear All
              </button>
            )}
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-center text-gray-400 py-12">No notifications sent yet</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((n) => (
                  <div key={n.id} className="p-4 hover:bg-gray-50/50 group">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-medium text-mayden-dark">{n.title}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={10} /> {new Date(n.sentAt).toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleDeleteOne(n.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">{n.body}</p>
                    <div className="flex items-center gap-2">
                      {n.channels.split(",").map((ch) => (
                        <span key={ch} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase">
                          {ch}
                        </span>
                      ))}
                      <span className="text-[10px] text-gray-400">by {n.sentBy}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
