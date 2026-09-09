export default function AdminCard({ children, className = "", title, actions }) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold text-mayden-dark">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}