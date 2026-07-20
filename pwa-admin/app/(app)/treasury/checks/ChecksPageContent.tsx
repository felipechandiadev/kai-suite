"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@kai/ui";
import { Select } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Badge } from "@kai/ui";
import { IconButton } from "@kai/ui";
import {
  CHECK_DIRECTION_LABELS,
  checkStatusLabel,
  type CheckDirection,
  type CheckRow,
  type CheckStatus,
  type CommittedOutgoingChecksSummary,
} from "@/features/treasury-checks/types/check.types";
import { CheckDetailDialog } from "./CheckDetailDialog";

type Props = {
  initialItems: CheckRow[];
  initialTotal: number;
  loadError: string | null;
  initialFilters: {
    status?: CheckStatus[];
    direction?: CheckDirection;
    search?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
  };
  committedSummary: CommittedOutgoingChecksSummary | null;
};

function formatMoney(n: number, currency = "CLP"): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function StatusBadge({
  status,
  direction,
}: {
  status: CheckStatus;
  direction?: CheckDirection;
}) {
  const variant =
    status === "CLEARED"
      ? "success-outlined"
      : status === "DEPOSITED"
        ? "info-outlined"
        : status === "PENDING"
          ? "warning-outlined"
          : status === "BOUNCED"
            ? "error-outlined"
            : status === "ENDORSED"
              ? "primary-outlined"
              : "secondary-outlined";
  return (
    <Badge variant={variant as any}>
      {checkStatusLabel(status, direction)}
    </Badge>
  );
}

function DirectionBadge({ direction }: { direction: CheckDirection }) {
  return (
    <Badge variant={direction === "INCOMING" ? "success-outlined" : "info-outlined"}>
      {CHECK_DIRECTION_LABELS[direction]}
    </Badge>
  );
}

export function ChecksPageContent({
  initialItems,
  initialTotal,
  loadError,
  initialFilters,
  committedSummary,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [direction, setDirection] = useState<CheckDirection | "">(
    initialFilters.direction ?? "",
  );
  const [statusFilter, setStatusFilter] = useState<CheckStatus | "">(
    initialFilters.status && initialFilters.status.length > 0
      ? initialFilters.status[0]
      : "",
  );
  const [search, setSearch] = useState(initialFilters.search ?? "");

  const [selected, setSelected] = useState<CheckRow | null>(null);

  const items = initialItems;
  const total = initialTotal;

  const directionOptions = useMemo(
    () => [
      { id: "", label: "Todos" },
      { id: "INCOMING", label: "Recibidos" },
      { id: "OUTGOING", label: "Emitidos" },
    ],
    [],
  );
  const statusOptions = useMemo(
    () => [
      { id: "", label: "Todos" },
      { id: "PENDING", label: "Pendiente" },
      { id: "DEPOSITED", label: "Depositado" },
      { id: "CLEARED", label: "Cobrado / pagado" },
      { id: "BOUNCED", label: "Protestado" },
      { id: "VOIDED", label: "Anulado" },
      { id: "ENDORSED", label: "Endosado" },
    ],
    [],
  );

  function applyFilters() {
    const params = new URLSearchParams(sp.toString());
    if (direction) {
      params.set("direction", direction);
    } else {
      params.delete("direction");
    }
    params.delete("status");
    if (statusFilter) {
      params.set("status", statusFilter);
    }
    if (search.trim()) {
      params.set("search", search.trim());
    } else {
      params.delete("search");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    setDirection("");
    setStatusFilter("");
    setSearch("");
    router.replace(pathname);
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4" data-test-id="checks-page-root">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Cartera de cheques
        </h1>
        <p className="text-sm text-muted-foreground">
          Cheques recibidos y emitidos. Cambios de estado se registran en la
          línea de tiempo del cheque.
        </p>
      </header>

      {committedSummary && committedSummary.checkCount > 0 ? (
        <section
          className="rounded-xl border border-warning/40 bg-warning/5 p-4"
          data-test-id="checks-committed-summary"
        >
          <h2 className="text-sm font-semibold text-foreground">
            Cheques emitidos pendientes de compensar
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {committedSummary.checkCount} cheque
            {committedSummary.checkCount === 1 ? "" : "s"} por{" "}
            {formatMoney(committedSummary.totalAmount)} comprometidos en caja /
            banco futuro.
          </p>
          {committedSummary.stalePendingCount > 0 ? (
            <p className="mt-2 text-sm text-warning">
              {committedSummary.stalePendingCount} con más de 90 días sin
              compensar — revise conciliación bancaria.
            </p>
          ) : null}
        </section>
      ) : null}

      <section
        className="rounded-xl border border-border bg-card p-4 shadow-sm"
        data-test-id="checks-page-filters"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Tipo"
            options={directionOptions}
            value={direction}
            onChange={(v) => setDirection((v as CheckDirection) ?? "")}
            data-test-id="checks-page-filter-direction"
          />
          <Select
            label="Estado"
            options={statusOptions}
            value={statusFilter}
            onChange={(v) => setStatusFilter((v as CheckStatus) ?? "")}
            data-test-id="checks-page-filter-status"
          />
          <TextField
            label="Buscar"
            placeholder="Número, banco, girador, beneficiario"
            value={search}
            onChange={(e) =>
              setSearch((e as React.ChangeEvent<HTMLInputElement>).target.value)
            }
            data-test-id="checks-page-filter-search"
          />
          <div className="flex items-end gap-2">
            <Button
              variant="primary"
              onClick={applyFilters}
              data-test-id="checks-page-filter-apply"
            >
              Aplicar
            </Button>
            <Button
              variant="outlinedSecondary"
              onClick={clearFilters}
              data-test-id="checks-page-filter-clear"
            >
              Limpiar
            </Button>
          </div>
        </div>
      </section>

      {loadError ? (
        <p className="text-sm text-error">{loadError}</p>
      ) : items.length === 0 ? (
        <div
          className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground"
          data-test-id="checks-page-empty"
        >
          No hay cheques que mostrar con los filtros actuales.
        </div>
      ) : (
        <>
          <div className="text-xs text-muted-foreground">{total} cheque(s)</div>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full border-collapse text-sm" data-test-id="checks-page-table">
              <thead className="bg-muted/10 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">N°</th>
                  <th className="px-3 py-2 text-left">Banco</th>
                  <th className="px-3 py-2 text-left">Contraparte</th>
                  <th className="px-3 py-2 text-right">Monto</th>
                  <th className="px-3 py-2 text-left">Emisión</th>
                  <th className="px-3 py-2 text-left">A fecha</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-border hover:bg-muted/10"
                    data-test-id={`checks-row-${c.id}`}
                  >
                    <td className="px-3 py-2">
                      <DirectionBadge direction={c.direction} />
                    </td>
                    <td className="px-3 py-2 font-mono">{c.checkNumber}</td>
                    <td className="px-3 py-2">{c.bankName}</td>
                    <td className="px-3 py-2">
                      {c.direction === "INCOMING"
                        ? c.drawerName ?? "—"
                        : c.payeeName ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(Number(c.amount), c.currency || "CLP")}
                    </td>
                    <td className="px-3 py-2">{c.issueDate}</td>
                    <td className="px-3 py-2">{c.dueDate ?? "—"}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={c.status} direction={c.direction} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <IconButton
                        icon="Eye"
                        variant="action"
                        size="sm"
                        ariaLabel="Ver detalle"
                        onClick={() => setSelected(c)}
                        data-test-id={`checks-row-detail-${c.id}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <CheckDetailDialog
        check={selected}
        onClose={() => setSelected(null)}
        onChanged={() => {
          setSelected(null);
          router.refresh();
        }}
      />
    </div>
  );
}
