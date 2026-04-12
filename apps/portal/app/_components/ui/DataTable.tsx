import { ReactNode } from "react";
import clsx from "clsx";

type Column<T = any> = {
  id: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
};

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-ui-border bg-white">
      <table className="w-full min-w-[860px] border-separate border-spacing-0">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                className={clsx(
                  "border-b-2 border-ui-border bg-[#f8fafc] px-5 py-4 text-left text-sm font-bold uppercase tracking-[0.08em] text-ui-textMuted",
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={clsx(
                  "border-b border-ui-border",
                  onRowClick ? "cursor-pointer transition hover:bg-[#f0f5ff]" : ""
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={clsx("border-b border-ui-border px-5 py-4 text-base text-ui-textPrimary", column.className)}
                  >
                    {column.render ? column.render(row) : (row[column.id as keyof T] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-base text-ui-textMuted">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
