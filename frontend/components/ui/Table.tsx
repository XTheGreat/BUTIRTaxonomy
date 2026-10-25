import React from "react";
import { PackageOpen } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  headerClassName?: string;
  render?: (item: T, index: number) => React.ReactNode;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  className?: string;
  emptyMessage?: string;
  expandedKey?: string | null;
  renderExpanded?: (item: T, index: number) => React.ReactNode;
}

export default function Table<T extends Record<string, any>>({
  columns,
  data,
  keyField = "id",
  className = "",
  emptyMessage = "Tidak ada data.",
  expandedKey = null,
  renderExpanded,
}: TableProps<T>) {
  return (
    <div className={`w-full overflow-x-auto border border-[var(--line)] rounded-none bg-[var(--canvas)] ${className}`}>
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="bg-[var(--surface)] border-b border-[var(--line)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] ${
                  col.headerClassName || ""
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 sm:py-16 text-center text-sm text-[var(--ink-muted)] font-normal"
              >
                <div className="flex flex-col items-center justify-center gap-2.5 select-none py-2">
                  <PackageOpen
                    size={44}
                    strokeWidth={1.25}
                    className="text-[var(--ink-muted)]/65"
                  />
                  <span>{emptyMessage}</span>
                </div>
              </td>
            </tr>
          ) : (
            data.map((item, index) => {
              const buka = renderExpanded && expandedKey != null && item[keyField] === expandedKey;
              return (
                <React.Fragment key={item[keyField] ?? index}>
                  <tr
                    className={`transition-colors duration-140 ease-out ${
                      buka ? "bg-[var(--surface)]" : "hover:bg-[var(--surface)]/70"
                    }`}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-2.5 text-sm text-[var(--ink)] align-middle ${
                          col.className || ""
                        }`}
                      >
                        {col.render ? col.render(item, index) : item[col.key]}
                      </td>
                    ))}
                  </tr>
                  {buka && (
                    <tr className="bg-[var(--surface)]">
                      <td colSpan={columns.length} className="p-0">
                        {renderExpanded(item, index)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
