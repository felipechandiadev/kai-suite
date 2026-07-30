"use client";

import { useMemo, useState } from "react";
import { TextField } from "@kai/ui";
import { TRANSACTION_TYPE_OPTIONS } from "@/features/transactions/types/transaction-types";

export function TransactionTypesTable() {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const rows = useMemo(() => {
    if (!query) return TRANSACTION_TYPE_OPTIONS;
    return TRANSACTION_TYPE_OPTIONS.filter((t) => {
      const blob = `${t.id} ${t.label} ${t.category} ${t.description} ${t.deprecated ? "deprecated" : ""}`.toLowerCase();
      return blob.includes(query);
    });
  }, [query]);

  return (
    <div className="flex min-w-0 flex-col gap-3" data-test-id="transaction-types-table-root">
      <div className="w-full max-w-xl">
        <TextField
          label="Buscar"
          name="transaction-types-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar"
          data-test-id="transaction-types-search"
        />
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-background" data-test-id="transaction-types-table-container">
        <div className="overflow-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-background">
              <tr>
                <th className="border-b border-border px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Código</th>
                <th className="border-b border-border px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Nombre</th>
                <th className="border-b border-border px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Categoría</th>
                <th className="border-b border-border px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Descripción</th>
                <th className="border-b border-border px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30" data-test-id={`transaction-type-row-${t.id}`}>
                  <td className="border-b border-border px-4 py-3 align-top">
                    <span className="font-mono text-xs text-foreground">{t.id}</span>
                  </td>
                  <td className="border-b border-border px-4 py-3 align-top text-sm text-foreground">{t.label}</td>
                  <td className="border-b border-border px-4 py-3 align-top text-sm text-foreground">{t.category}</td>
                  <td className="border-b border-border px-4 py-3 align-top text-sm text-foreground">
                    <p className="max-w-[720px] truncate" title={t.description}>
                      {t.description}
                    </p>
                  </td>
                  <td className="border-b border-border px-4 py-3 align-top text-sm">
                    {t.deprecated ? (
                      <span className="text-amber-700 dark:text-amber-400">Deprecated</span>
                    ) : (
                      <span className="text-emerald-700 dark:text-emerald-400">Activo</span>
                    )}
                  </td>
                </tr>
              ))}

              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm text-muted-foreground" colSpan={5} data-test-id="transaction-types-empty">
                    No hay tipos de transacción que mostrar.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span data-test-id="transaction-types-total-visible">Mostrando {rows.length}</span>
          <span data-test-id="transaction-types-total-general">Total: {TRANSACTION_TYPE_OPTIONS.length}</span>
        </div>
      </div>
    </div>
  );
}

