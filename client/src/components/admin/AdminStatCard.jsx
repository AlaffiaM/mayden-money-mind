export default function AdminStatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "text-gray-400",
}) {
  return (
    <div className="rounded-2xl border border-gray-100/90 bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.04)] transition-shadow hover:shadow-[0_10px_28px_rgba(26,26,26,0.07)]">
      <div className="flex items-center justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-mayden-pink-tint ring-1 ring-black/[0.03] ${accent}`}
        >
          <Icon size={18} />
        </div>
        {sub}
      </div>
      <p className="mt-4 text-2xl font-bold tracking-[-0.02em] text-mayden-dark lg:text-[1.7rem]">
        {value}
      </p>
      <p className="mt-0.5 text-sm text-gray-500">{label}</p>
    </div>
  );
}
