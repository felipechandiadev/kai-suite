"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Alert, BasicPageLayout, IconButton, adminFillViewportBelowTopBarClassName } from "@kai/ui";
import type {
  CheckRow,
  CommittedOutgoingChecksSummary,
} from "@/features/treasury-checks/types/check.types";
import { CheckDetailDialog } from "./CheckDetailDialog";
import { ChecksCalendar } from "./ChecksCalendar";
import {
  ChecksDataGrid,
  ChecksDirectionFilter,
  ChecksStatusFilter,
} from "./ChecksDataGrid";

type ChecksView = "list" | "calendar";

type Props = {
  initialItems: CheckRow[];
  initialTotal: number;
  loadError: string | null;
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

function parseView(raw: string | null): ChecksView {
  return raw === "calendar" ? "calendar" : "list";
}

export function ChecksPageContent({
  initialItems,
  initialTotal,
  loadError,
  committedSummary,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const view = parseView(sp.get("view"));

  const [selected, setSelected] = useState<CheckRow | null>(null);

  function setView(next: ChecksView) {
    const params = new URLSearchParams(sp.toString());
    if (next === "list") params.delete("view");
    else params.set("view", "calendar");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const viewToggle = (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-border p-0.5"
      role="group"
      aria-label="Vista de cheques"
      data-test-id="checks-view-toggle"
    >
      <IconButton
        icon="List"
        variant={view === "list" ? "primary" : "action"}
        size="sm"
        ariaLabel="Vista lista"
        title="Vista lista"
        onClick={() => setView("list")}
        data-test-id="checks-view-list"
      />
      <IconButton
        icon="Calendar"
        variant={view === "calendar" ? "primary" : "action"}
        size="sm"
        ariaLabel="Vista calendario"
        title="Vista calendario"
        onClick={() => setView("calendar")}
        data-test-id="checks-view-calendar"
      />
    </div>
  );

  const committedAlert =
    committedSummary && committedSummary.checkCount > 0 ? (
      <Alert variant="warning" data-test-id="checks-committed-summary">
        <p className="font-semibold text-foreground">
          Cheques emitidos pendientes de compensar
        </p>
        <p className="mt-1 text-sm">
          {committedSummary.checkCount} cheque
          {committedSummary.checkCount === 1 ? "" : "s"} por{" "}
          {formatMoney(committedSummary.totalAmount)} comprometidos en caja /
          banco futuro.
        </p>
        {committedSummary.stalePendingCount > 0 ? (
          <p className="mt-1 text-sm">
            {committedSummary.stalePendingCount} con más de 90 días sin
            compensar — revise conciliación bancaria.
          </p>
        ) : null}
      </Alert>
    ) : null;

  return (
    <BasicPageLayout
      title="Cartera de cheques"
      headerActions={viewToggle}
      className={`min-h-0 ${adminFillViewportBelowTopBarClassName}`}
      contentClassName="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden"
      data-test-id="checks-page-root"
    >
      {view === "calendar" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3" data-test-id="checks-calendar-view">
          {committedAlert}
          <div
            className="flex flex-wrap items-center gap-3"
            data-test-id="checks-calendar-filters"
          >
            <ChecksDirectionFilter />
            <ChecksStatusFilter />
          </div>
          {loadError ? (
            <p className="text-sm text-error">{loadError}</p>
          ) : initialItems.length === 0 ? (
            <div
              className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground"
              data-test-id="checks-page-empty"
            >
              No hay cheques que mostrar con los filtros actuales.
            </div>
          ) : (
            <ChecksCalendar rows={initialItems} onDetails={setSelected} />
          )}
        </div>
      ) : (
        <ChecksDataGrid
          rows={initialItems}
          total={initialTotal}
          loadError={loadError}
          onDetails={setSelected}
          committedSummary={committedSummary}
        />
      )}

      <CheckDetailDialog
        check={selected}
        onClose={() => setSelected(null)}
        onChanged={() => {
          setSelected(null);
          router.refresh();
        }}
      />
    </BasicPageLayout>
  );
}
