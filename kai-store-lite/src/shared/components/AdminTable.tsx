import type { ReactNode } from "react";
import { Alert, LoadingState } from "@kai/ui";

/**
 * Tabla HTML mínima para diálogos / stubs legacy.
 * Listas Admin vivas: usar `LiteDataGrid` (`DataGridTable` de `@kai/ui`).
 */
export function AdminTable({
  columns,
  rows,
  empty,
}: {
  columns: string[];
  rows: ReactNode[][];
  empty?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">{empty ?? "Sin datos."}</p>
    );
  }
  return (
    <div className="mt-4 overflow-auto rounded-lg border border-border bg-surface">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-neutral/40 text-left text-muted-foreground">
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {cells.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CoreError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mt-3">
      <Alert variant="error">Core: {message}</Alert>
    </div>
  );
}

export function LoadingLine({ loading }: { loading: boolean }) {
  if (!loading) return null;
  return (
    <div className="mt-3">
      <LoadingState label="Cargando…" />
    </div>
  );
}
