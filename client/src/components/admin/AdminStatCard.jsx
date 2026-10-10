export default function AdminStatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "text-gray-400",
}) {
  return (
    <div className="group rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(26,26,26,0.03)] transition-all hover:-translate-y-0.5 hover:border-mayden-magenta/20 hover:shadow-[0_12px_28px_rgba(26,26,26,0.07)]">
      <div className="flex items-center justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-mayden-pink-tint ring-1 ring-black/[0.03] transition-transform group-hover:scale-105 ${accent}`}
        >
          <Icon size={18} />
        </div>
        {sub}
      </div>
      <p className="mt-5 truncate text-2xl font-bold tracking-[-0.035em] text-mayden-dark lg:text-[1.7rem]">
        {value}
      </p>
      <p className="mt-0.5 text-sm text-gray-500">{label}</p>
    </div>
  );
}
