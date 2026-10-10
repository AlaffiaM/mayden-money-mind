export default function AdminCard({
  children,
  className = "",
  title,
  actions,
}) {
  return (
    <div
      className={`rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(26,26,26,0.03)] sm:p-6 ${className}`}
    >
      {(title || actions) && (
        <div className="mb-5 flex items-center justify-between gap-3">
          {title && (
            <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-mayden-dark">
              {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
