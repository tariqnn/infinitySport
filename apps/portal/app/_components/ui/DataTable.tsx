import { ReactNode } from 'react';

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
    <div className="overflow-x-auto rounded-xl border border-ui-border bg-white shadow-sm">
      <table className="w-full divide-y divide-ui-border">
        <thead className="bg-ui-softBg">
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ui-textMuted ${column.className || ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ui-border bg-white">
          {rows.length > 0 ? (
            rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={`transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-ui-softBg' : ''
                }`}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={`whitespace-nowrap px-6 py-4 text-sm text-ui-textPrimary ${column.className || ''}`}
                  >
                    {column.render
                      ? column.render(row)
                      : (row[column.id as keyof T] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-ui-textMuted">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

