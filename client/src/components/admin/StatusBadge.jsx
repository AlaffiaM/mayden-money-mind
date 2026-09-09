const STYLES = {
  active: "bg-emerald-100 text-emerald-700",
  success: "bg-emerald-100 text-emerald-700",
  published: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  scheduled: "bg-amber-100 text-amber-700",
  draft: "bg-gray-100 text-gray-600",
  unassigned: "bg-amber-100 text-amber-700",
  cancelled: "bg-gray-100 text-gray-600",
  past_due: "bg-red-100 text-red-600",
  expired: "bg-red-100 text-red-600",
  failed: "bg-red-100 text-red-600",
  admin: "bg-purple-100 text-purple-700",
  user: "bg-blue-100 text-blue-700",
  inapp: "bg-mayden-pink-tint text-mayden-magenta",
  email: "bg-purple-100 text-purple-700",
};

const LABELS = {
  past_due: "Past Due",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
};

export default function StatusBadge({ status, label }) {
  const key = String(status ?? "").toLowerCase();
  const style = STYLES[key] || "bg-gray-100 text-gray-600";
  const text = label || LABELS[key] || status || "—";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${style}`}
    >
      {text}
    </span>
  );
}