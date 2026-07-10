"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Switch } from "@kai/ui";
import type { AccountHierarchyNode } from "@/features/accounting-chart-of-accounts/types/chart-of-accounts.types";

type Row = {
  id: string;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
  balance: number;
  depth: number;
};

const TYPE_LABEL: Record<string, string> = {
  ASSET: "Activo",
  LIABILITY: "Pasivo",
  EQUITY: "Patrimonio",
  INCOME: "Ingreso",
  EXPENSE: "Gasto",
};

function flattenTree(nodes: AccountHierarchyNode[], depth = 0, out: Row[] = []): Row[] {
  for (const n of nodes) {
    out.push({
      id: n.id,
      code: n.code,
      name: n.name,
      type: n.type,
      isActive: n.isActive,
      balance: Number(n.balance) || 0,
      depth,
    });
    if (Array.isArray(n.children) && n.children.length > 0) {
      flattenTree(n.children, depth + 1, out);
    }
  }
  return out;
}

function IncludeInactiveToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const includeInactive = searchParams.get("includeInactive") === "true" || searchParams.get("includeInactive") === "1";

  return (
    <Switch
      checked={includeInactive}
      onChange={(v) => {
        const next = new URLSearchParams(searchParams.toString());
        if (v) {
          next.set("includeInactive", "true");
        } else {
          next.delete("includeInactive");
        }
        router.replace(`?${next.toString()}`, { scroll: false });
      }}
      label="Incluir inactivas"
      labelPosition="right"
      data-test-id="coa-include-inactive"
    />
  );
}

export default function ChartOfAccountsDataGrid({ hierarchy }: { hierarchy: AccountHierarchyNode[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();

  const rows = useMemo(() => flattenTree(hierarchy), [hierarchy]);
  const filtered = useMemo(() => {
    if (!q) return rows;
    return rows.filter((r) => {
      const blob = `${r.code} ${r.name} ${r.type}`.toLowerCase();
      return blob.includes(q);
    });
  }, [rows, q]);

  return (
    <div className="flex min-w-0 flex-col gap-3" data-test-id="coa-table-root">
      <div className="flex w-full min-w-0 justify-end">
        <IncludeInactiveToggle />
      </div>

      <div
        className="overflow-hidden rounded-md border border-border bg-background"
        style={{ height: "85vh" }}
        data-test-id="coa-table-container"
      >
        <div className="h-full overflow-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-background">
              <tr>
                <th className="border-b border-border px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Cuenta</th>
                <th className="border-b border-border px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Tipo</th>
                <th className="border-b border-border px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Activa</th>
                <th className="border-b border-border px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const pad = Math.min(9, Math.max(0, r.depth)) * 12;
                const title = `${r.code} · ${r.name}`;
                return (
                  <tr key={r.id} className="hover:bg-muted/30" data-test-id={`coa-row-${r.id}`}>
                    <td className="border-b border-border px-4 py-3 align-top">
                      <div className="min-w-0" style={{ paddingLeft: pad }} title={title}>
                        <p className="truncate font-mono text-xs text-muted-foreground">{r.code}</p>
                        <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
                      </div>
                    </td>
                    <td className="border-b border-border px-4 py-3 align-top text-sm text-foreground">
                      {TYPE_LABEL[r.type] ?? r.type}
                    </td>
                    <td className="border-b border-border px-4 py-3 align-top text-sm">
                      <span className={r.isActive ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>
                        {r.isActive ? "Sí" : "No"}
                      </span>
                    </td>
                    <td className="border-b border-border px-4 py-3 align-top text-right text-sm">
                      <span className="font-mono tabular-nums text-foreground">
                        {new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(Number(r.balance) || 0)}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm text-muted-foreground" colSpan={4} data-test-id="coa-empty">
                    No hay cuentas para mostrar.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span data-test-id="coa-total-visible">Mostrando {filtered.length}</span>
          <span data-test-id="coa-total-general">Total: {rows.length}</span>
        </div>
      </div>
    </div>
  );
}

