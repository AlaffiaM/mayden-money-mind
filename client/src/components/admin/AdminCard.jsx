export default function AdminCard({
  children,
  className = "",
  title,
  actions,
}) {
  return (
    <div
      className={`rounded-2xl border border-gray-100/90 bg-white p-5 shadow-[0_8px_24px_rgba(26,26,26,0.04)] ${className}`}
    >
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && (
            <h2 className="text-base font-semibold tracking-[-0.01em] text-mayden-dark">
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
