// Admin dashboard — stats cards (revenue, subscribers, churn, today's episode)
// Includes a 30-day subscriber growth SVG line chart and clickable stat cards
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Users, CreditCard, FileText, TrendingUp, TrendingDown, Activity, AlertCircle, Download, BarChart3, Send } from "lucide-react";

// SVG mini line chart — renders a filled area chart from { date, count } data points
function MiniLineChart({ data, color = "#EC268F", height = 60 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.count), 1);
  const width = 400;
  const padding = 2;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  // Convert data points to SVG coordinate pairs
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * chartW;
    const y = padding + chartH - (d.count / max) * chartH;
    return `${x},${y}`;
  });

  // Polygon points for the filled area under the line
  const areaPoints = [
    `${padding},${padding + chartH}`,
    ...points,
    `${padding + chartW},${padding + chartH}`,
  ].join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#chartGrad)" />
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Green/red trend badge showing percentage change (e.g. +12% or -5%)
function TrendBadge({ value, suffix = "%" }) {
  if (value === 0 || value === undefined || value === null) return <span className="text-xs text-gray-400">—</span>;
  const positive = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${positive ? "text-emerald-600" : "text-red-500"}`}>
      {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {positive ? "+" : ""}{value}{suffix}
    </span>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [utmReport, setUtmReport] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch dashboard stats on mount
  useEffect(() => {
    Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/reports/utm"),
    ])
      .then(([statsRes, utmRes]) => {
        setStats(statsRes.data);
        setUtmReport(utmRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Email yesterday's reconciliation report immediately (test before the daily job)
  const sendReportNow = async () => {
    setSending(true);
    setSendFeedback(null);
    try {
      const { data } = await api.post("/admin/reports/send-now");
      if (data.sent) {
        setSendFeedback({ ok: true, text: `Report emailed via Brevo — ${data.count} payment(s).` });
      } else {
        setSendFeedback({ ok: false, text: `Email not sent: ${data.reason}. Set BREVO_API_KEY, BREVO_FROM_EMAIL and RECONCILIATION_EMAIL.` });
      }
    } catch {
      setSendFeedback({ ok: false, text: "Failed to send report." });
    } finally {
      setSending(false);
    }
  };

  // Download last-24h successful payments as CSV
  const downloadCsv = async () => {
    setDownloading(true);
    try {
      const res = await api.get("/admin/payments/export?days=1", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payments-last24h-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.dispatchEvent(
        new CustomEvent("api:error", { detail: { status: 500, message: "Failed to download CSV" } })
      );
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-mayden-magenta border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return <p className="text-gray-500">Failed to load dashboard.</p>;

  const cards = [
    {
      label: "Revenue This Month",
      value: `₦${(stats.revenue || 0).toLocaleString()}`,
      icon: CreditCard,
      color: "bg-emerald-500",
      trend: stats.revenueTrend,
    },
    {
      label: "Active Subscribers",
      value: stats.activeSubscriptions || 0,
      icon: Users,
      color: "bg-mayden-magenta",
      trend: stats.subscriptionTrend,
    },
    {
      label: "Churn Rate",
      value: `${stats.churnRate || 0}%`,
      icon: TrendingDown,
      color: "bg-amber-500",
    },
    {
      label: "Today's Episode",
      value: stats.todayEpisode ? stats.todayEpisode.title : "Missing",
      sub: stats.todayEpisode ? stats.todayEpisode.status : "No episode published",
      icon: stats.todayEpisode ? FileText : AlertCircle,
      color: stats.todayEpisode ? "bg-blue-500" : "bg-red-500",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-mayden-dark">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center`}>
                <card.icon size={20} className="text-white" />
              </div>
              {card.trend !== undefined && <TrendBadge value={card.trend} />}
            </div>
            <p className="text-2xl font-bold text-mayden-dark truncate">{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            {card.sub && <p className="text-xs text-gray-400 mt-0.5 capitalize">{card.sub}</p>}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-mayden-dark">Subscriber Growth (30 Days)</h2>
          <Activity size={16} className="text-gray-400" />
        </div>
        {stats.subscriberGrowth && stats.subscriberGrowth.length > 0 ? (
          <div>
            <div className="flex items-end justify-between text-xs text-gray-400 mb-2">
              <span>{stats.subscriberGrowth[0]?.date}</span>
              <span>{stats.subscriberGrowth[stats.subscriberGrowth.length - 1]?.date}</span>
            </div>
            <MiniLineChart data={stats.subscriberGrowth} height={120} />
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <span>Min: {Math.min(...stats.subscriberGrowth.map(d => d.count))}</span>
              <span>Max: {Math.max(...stats.subscriberGrowth.map(d => d.count))}</span>
              <span>Total: {stats.subscriberGrowth.reduce((s, d) => s + d.count, 0)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">No subscriber data yet</p>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-mayden-dark">Reconciliation &amp; UTM</h2>
          <BarChart3 size={16} className="text-gray-400" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-2">
          <button
            onClick={downloadCsv}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-mayden-magenta text-white text-sm font-medium hover:bg-mayden-magenta/90 transition-colors disabled:opacity-50"
          >
            <Download size={16} />
            {downloading ? "Downloading..." : "Download CSV (last 24h)"}
          </button>
          <button
            onClick={sendReportNow}
            disabled={sending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-mayden-dark text-white text-sm font-medium hover:bg-mayden-dark/90 transition-colors disabled:opacity-50"
          >
            <Send size={16} />
            {sending ? "Sending..." : "Send report now"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-1">
          Successful payments from the last 24 hours for finance reconciliation. "Send report now" emails the same last-24h report via Brevo.
        </p>
        {sendFeedback && (
          <p className={`text-xs mb-3 ${sendFeedback.ok ? "text-emerald-600" : "text-amber-600"}`}>
            {sendFeedback.text}
          </p>
        )}

        {utmReport?.sources?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2 pr-4">Campaign</th>
                  <th className="py-2 pr-4">Registered</th>
                  <th className="py-2 pr-4">Paid</th>
                  <th className="py-2">Active Subscribers</th>
                </tr>
              </thead>
              <tbody>
                {utmReport.sources.map((s) => (
                  <tr key={`${s.utmSource}-${s.utmCampaign || ""}`} className="border-b border-gray-50">
                    <td className="py-2.5 pr-4 font-medium text-mayden-dark">{s.utmSource || "direct"}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{s.utmCampaign || "—"}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{s.registered}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{s.paid}</td>
                    <td className="py-2.5 text-gray-500">{s.active}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">
            No UTM-attributed signups yet — users landing from the Mayden site will appear here.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => navigate("/admin/subscriptions")}
          className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-left hover:border-mayden-magenta/30 transition-colors"
        >
          <p className="text-sm text-gray-500 mb-1">Total Users</p>
          <p className="text-2xl font-bold text-mayden-dark">{stats.totalUsers}</p>
        </button>
        <button
          onClick={() => navigate("/admin/episodes")}
          className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-left hover:border-mayden-magenta/30 transition-colors"
        >
          <p className="text-sm text-gray-500 mb-1">Episodes Published</p>
          <p className="text-2xl font-bold text-mayden-dark">{stats.totalEpisodes}</p>
        </button>
      </div>
    </div>
  );
}
