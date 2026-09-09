import { Children } from "react";

export default function AdminTable({
  columns,
  children,
  empty = "Nothing here yet.",
}) {
  const emptyState = Children.count(children) === 0;
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100/90 shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-mayden-gray/70">
            {columns.map((col, i) => (
              <th
                key={i}
                className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500 ${col.className || ""}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">{children}</tbody>
      </table>
      {emptyState && (
        <p className="bg-white py-12 text-center text-sm text-gray-500">
          {empty}
        </p>
      )}
    </div>
  );
}
