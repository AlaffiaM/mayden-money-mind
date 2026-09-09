import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  Users,
  CreditCard,
  TrendingDown,
  FileText,
  AlertCircle,
  Activity,
  Download,
  ArrowUpRight,
} from "lucide-react";
import AdminPageHeading from "../../components/admin/AdminPageHeading";
import AdminStatCard from "../../components/admin/AdminStatCard";
import AdminCard from "../../components/admin/AdminCard";
import AdminTable from "../../components/admin/AdminTable";
import Loader from "../../components/admin/Loader";
import { useToast } from "../../components/admin/useToast.js";

function MiniLineChart({ data, color = "#EC268F", height = 60 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.count), 1);
  const width = 400;
  const padding = 2;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * chartW;
    const y = padding + chartH - (d.count / max) * chartH;
    return `${x},${y}`;
  });

  const areaPoints = [
    `${padding},${padding + chartH}`,
    ...points,
    `${padding + chartW},${padding + chartH}`,
  ].join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height }}
    >
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#chartGrad)" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrendBadge({ value, suffix = "%" }) {
  if (value === 0 || value === undefined || value === null)
    return <span className="text-xs text-gray-400">—</span>;
  const positive = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full bg-white/5 px-1.5 py-0.5 text-xs font-medium ${positive ? "text-emerald-600" : "text-red-500"}`}
    >
      {positive ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [utmReport, setUtmReport] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    Promise.all([api.get("/admin/stats"), api.get("/admin/reports/utm")])
      .then(([statsRes, utmRes]) => {
        setStats(statsRes.data);
        setUtmReport(utmRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const downloadCsv = async () => {
    setDownloading(true);
    try {
      const res = await api.get("/admin/payments/export?days=1", {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payments-last24h-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Payment CSV downloaded.");
    } catch {
      toast("Failed to download CSV.", "error");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <Loader label="Loading dashboard…" />;
  if (!stats) return <p className="text-gray-500">Failed to load dashboard.</p>;

  const cards = [
    {
      label: "Revenue This Month",
      value: `₦${(stats.revenue || 0).toLocaleString()}`,
      icon: CreditCard,
      accent: "text-emerald-600 bg-emerald-50",
      sub: <TrendBadge value={stats.revenueTrend} />,
    },
    {
      label: "Active Subscribers",
      value: stats.activeSubscriptions || 0,
      icon: Users,
      accent: "text-mayden-magenta",
      sub: <TrendBadge value={stats.subscriptionTrend} />,
    },
    {
      label: "Churn Rate",
      value: `${stats.churnRate || 0}%`,
      icon: TrendingDown,
      accent: "text-amber-600",
      sub: null,
    },
    {
      label: "Today's Episode",
      value: stats.todayEpisode ? stats.todayEpisode.title : "Missing",
      icon: stats.todayEpisode ? FileText : AlertCircle,
      accent: stats.todayEpisode ? "text-blue-600" : "text-mayden-magenta",
      sub: stats.todayEpisode ? (
        <span className="text-xs text-gray-400 capitalize">
          {stats.todayEpisode.status}
        </span>
      ) : (
        <span className="text-xs text-gray-500">No episode scheduled yet</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeading
        title="Dashboard"
        subtitle="An overview of revenue, subscribers, and growth."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <AdminStatCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            value={card.value}
            accent={card.accent}
            sub={card.sub}
          />
        ))}
      </div>

      <AdminCard
        title="Subscriber Growth (30 Days)"
        actions={<Activity size={16} className="text-gray-400" />}
      >
        {stats.subscriberGrowth && stats.subscriberGrowth.length > 0 ? (
          <div>
            <div className="mb-2 flex items-end justify-between text-xs text-gray-400">
              <span>{stats.subscriberGrowth[0]?.date}</span>
              <span>
                {
                  stats.subscriberGrowth[stats.subscriberGrowth.length - 1]
                    ?.date
                }
              </span>
            </div>
            <MiniLineChart data={stats.subscriberGrowth} height={120} />
            <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
              <span>
                Min: {Math.min(...stats.subscriberGrowth.map((d) => d.count))}
              </span>
              <span>
                Max: {Math.max(...stats.subscriberGrowth.map((d) => d.count))}
              </span>
              <span>
                Total: {stats.subscriberGrowth.reduce((s, d) => s + d.count, 0)}
              </span>
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-gray-500">
            No subscriber data yet
          </p>
        )}
      </AdminCard>

      <AdminCard
        title="Payment reconciliation and campaign tracking"
        actions={
          <button
            onClick={downloadCsv}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-full bg-mayden-magenta px-4 py-2 text-sm font-medium text-white shadow-md shadow-mayden-magenta/20 transition-colors hover:bg-mayden-magenta/90 disabled:opacity-50"
          >
            <Download size={15} />
            {downloading ? "Downloading…" : "Download CSV (last 24h)"}
          </button>
        }
      >
        <p className="mb-4 text-xs text-gray-400">
          Successful payments for finance reconciliation. Reports are also
          emailed automatically — daily at midnight and monthly on the 1st.
        </p>

        {utmReport?.sources?.length > 0 ? (
          <AdminTable
            columns={[
              { label: "Source" },
              { label: "Campaign" },
              { label: "Registered" },
              { label: "Paid" },
              { label: "Active Subscribers" },
            ]}
          >
            {utmReport.sources.map((s) => (
              <tr key={`${s.utmSource}-${s.utmCampaign || ""}`}>
                <td className="px-4 py-3 font-medium text-mayden-dark">
                  {s.utmSource || "direct"}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {s.utmCampaign || "—"}
                </td>
                <td className="px-4 py-3 text-gray-500">{s.registered}</td>
                <td className="px-4 py-3 text-gray-500">{s.paid}</td>
                <td className="px-4 py-3 text-gray-500">{s.active}</td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <p className="py-6 text-center text-sm text-gray-400">
            No campaign-attributed signups yet. Visitors coming from the Mayden
            site will appear here.
          </p>
        )}
      </AdminCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          onClick={() => navigate("/admin/subscriptions")}
          className="group rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all hover:border-mayden-magenta/30 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Total Users</p>
            <ArrowUpRight
              size={16}
              className="text-gray-300 transition-colors group-hover:text-mayden-magenta"
            />
          </div>
          <p className="mt-1 text-2xl font-bold text-mayden-dark">
            {stats.totalUsers}
          </p>
        </button>
        <button
          onClick={() => navigate("/admin/episodes")}
          className="group rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all hover:border-mayden-magenta/30 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Episodes Published</p>
            <ArrowUpRight
              size={16}
              className="text-gray-300 transition-colors group-hover:text-mayden-magenta"
            />
          </div>
          <p className="mt-1 text-2xl font-bold text-mayden-dark">
            {stats.totalEpisodes}
          </p>
        </button>
      </div>
    </div>
  );
}
