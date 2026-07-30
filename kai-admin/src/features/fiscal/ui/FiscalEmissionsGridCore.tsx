"use client";

import { useCallback, useMemo, useState } from "react";
import { DataGridTable as DataGrid } from "@kai/ui";
import type { DataGridColumn } from "@kai/ui";
import { Badge, type BadgeVariant } from "@kai/ui";
import { IconButton } from "@kai/ui";
import { Button } from "@kai/ui";
import {
  refreshFiscalEmissionSiiStatusAction,
  retryFiscalBoletaEmissionAction,
} from "../actions/fiscal.actions";
import type { FiscalEmissionRow, FiscalEmissionsFixedFilters } from "../types/fiscal.types";
import {
  SALES_PAYMENT_METHOD_LABEL,
  type SalesPaymentMethod,
} from "@/features/sales-payments/types/sales-payment.types";
import SaleTransactionDetailDialog from "../../../../app/(app)/sales/transactions/ui/SaleTransactionDetailDialog";
import { useFiscalEmissionsList } from "../hooks/useFiscalEmissionsList";

type EnvioFilter = "" | "PENDING" | "SENDING" | "SENT" | "FAILED" | "EPR" | "RCH";

type Props = {
  initialItems: FiscalEmissionRow[];
  initialTotal: number;
  fixedFilters?: FiscalEmissionsFixedFilters;
  showPackColumns?: boolean;
  embedded?: boolean;
  title?: string;
  showFilters?: boolean;
  autoLoad?: boolean;
};

function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDate(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const iso = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const d = new Date(value.trim());
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const d = new Date(value.trim());
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function siiStatusBadge(status: string): { label: string; variant: BadgeVariant } {
  switch (status) {
    case "EPR":
      return { label: "Autorizado", variant: "success-outlined" };
    case "RCH":
      return { label: "Rechazado", variant: "error-outlined" };
    case "SENT":
      return { label: "Enviado (pendiente SII)", variant: "warning-outlined" };
    case "FAILED":
      return { label: "Fallido envío", variant: "error-outlined" };
    case "PENDING":
      return { label: "Pendiente", variant: "warning-outlined" };
    case "SENDING":
      return { label: "Enviando", variant: "warning-outlined" };
    default:
      return { label: status || "—", variant: "secondary-outlined" };
  }
}

function paymentLabel(method: string | null): string {
  if (!method) return "—";
  const key = method as SalesPaymentMethod;
  return SALES_PAYMENT_METHOD_LABEL[key] ?? method;
}

type GridRow = FiscalEmissionRow & {
  id: string;
  folioDisplay: string;
  issuedAtDisplay: string;
  saleAtDisplay: string;
  totalDisplay: string;
  receptorDisplay: string;
  siiStatusLabel: string;
  siiStatusVariant: BadgeVariant;
  paymentDisplay: string;
};

function mapToGridRows(items: FiscalEmissionRow[]): GridRow[] {
  return items.map((row) => {
    const badge = siiStatusBadge(row.envioStatus);
    return {
      ...row,
      id: row.id,
      folioDisplay: String(row.folio),
      issuedAtDisplay: formatDate(row.issuedAt),
      saleAtDisplay: formatDateTime(row.transactionCreatedAt),
      totalDisplay: formatMoney(row.mntTotal),
      receptorDisplay: `${row.receptorRut} · ${row.receptorName}`,
      siiStatusLabel: badge.label,
      siiStatusVariant: badge.variant,
      paymentDisplay: paymentLabel(row.paymentMethod),
    };
  });
}

export function FiscalEmissionsGridCore({
  initialItems,
  initialTotal,
  fixedFilters,
  showPackColumns = false,
  embedded = false,
  title = "Folios emitidos",
  showFilters = true,
  autoLoad = false,
}: Props) {
  const {
    items,
    setItems,
    total,
    page,
    limit,
    statusFilter,
    setStatusFilter,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    folioSearch,
    setFolioSearch,
    error,
    setError,
    actionMessage,
    setActionMessage,
    isPending,
    fetchPage,
    applyFilters,
    refreshCurrentPage,
  } = useFiscalEmissionsList({ initialItems, initialTotal, fixedFilters, autoLoad });

  const [retryBusyId, setRetryBusyId] = useState<string | null>(null);
  const [refreshBusyId, setRefreshBusyId] = useState<string | null>(null);
  const [detailTxId, setDetailTxId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleRetry = useCallback(
    async (row: GridRow) => {
      setRetryBusyId(row.id);
      setActionMessage("");
      setError("");
      const res = await retryFiscalBoletaEmissionAction(row.transactionId);
      setRetryBusyId(null);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setActionMessage(`Reintento enviado para folio ${row.folio}`);
      refreshCurrentPage();
    },
    [refreshCurrentPage, setActionMessage, setError],
  );

  const handleRefreshSii = useCallback(
    async (row: GridRow) => {
      setRefreshBusyId(row.id);
      setActionMessage("");
      setError("");
      const res = await refreshFiscalEmissionSiiStatusAction(row.id);
      setRefreshBusyId(null);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setActionMessage(`Estado SII actualizado para folio ${row.folio}`);
      setItems((prev) => prev.map((item) => (item.id === res.item.id ? res.item : item)));
    },
    [setActionMessage, setError, setItems],
  );

  const columns: DataGridColumn[] = useMemo(() => {
    const cols: DataGridColumn[] = [
      {
        field: "folioDisplay",
        headerName: "Folio",
        width: 90,
        sortable: false,
        filterable: false,
        renderCell: ({ value }) => (
          <span className="font-mono text-xs font-medium">{String(value ?? "—")}</span>
        ),
      },
    ];

    if (showPackColumns) {
      cols.push(
        {
          field: "packageCode",
          headerName: "Paquete",
          width: 120,
          sortable: false,
          filterable: false,
          cellOverflow: "truncate",
          renderCell: ({ value }) => (
            <span className="font-mono text-xs">{String(value ?? "—")}</span>
          ),
        },
        {
          field: "subPackCode",
          headerName: "Sub-paquete",
          width: 130,
          sortable: false,
          filterable: false,
          cellOverflow: "truncate",
          renderCell: ({ value }) => (
            <span className="font-mono text-xs">{String(value ?? "—")}</span>
          ),
        },
        {
          field: "pointOfSaleName",
          headerName: "POS",
          minWidth: 100,
          flex: 0.7,
          sortable: false,
          filterable: false,
          cellOverflow: "truncate",
          renderCell: ({ value }) => String(value ?? "—"),
        },
      );
    }

    cols.push(
      {
        field: "issuedAtDisplay",
        headerName: "Fecha emisión",
        width: 110,
        sortable: false,
        filterable: false,
      },
      {
        field: "saleAtDisplay",
        headerName: "Fecha venta",
        width: 140,
        sortable: false,
        filterable: false,
      },
      {
        field: "totalDisplay",
        headerName: "Total",
        width: 110,
        align: "right",
        sortable: false,
        filterable: false,
      },
      {
        field: "receptorDisplay",
        headerName: "Receptor",
        minWidth: 160,
        flex: 1.2,
        sortable: false,
        filterable: false,
        cellOverflow: "truncate",
      },
      {
        field: "branchName",
        headerName: "Sucursal",
        minWidth: 120,
        flex: 0.8,
        sortable: false,
        filterable: false,
        cellOverflow: "truncate",
        renderCell: ({ value }) => String(value ?? "—"),
      },
      {
        field: "paymentDisplay",
        headerName: "Medio pago",
        width: 110,
        sortable: false,
        filterable: false,
        cellOverflow: "truncate",
      },
      {
        field: "siiStatusLabel",
        headerName: "Estado SII",
        width: 180,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => {
          const r = row as GridRow;
          const title =
            r.envioStatus === "RCH" && r.errorMessage ? r.errorMessage : undefined;
          return (
            <span title={title}>
              <Badge variant={r.siiStatusVariant}>{r.siiStatusLabel}</Badge>
            </span>
          );
        },
      },
      {
        field: "trackId",
        headerName: "Track ID",
        minWidth: 100,
        flex: 0.8,
        sortable: false,
        filterable: false,
        cellOverflow: "truncate",
        renderCell: ({ value }) => (
          <span className="font-mono text-xs" title={String(value ?? "")}>
            {value ? String(value) : "—"}
          </span>
        ),
      },
      {
        field: "documentNumber",
        headerName: "Doc. interno",
        width: 120,
        sortable: false,
        filterable: false,
        renderCell: ({ value }) => (
          <span className="font-mono text-xs">{String(value ?? "—")}</span>
        ),
      },
      {
        field: "actions",
        headerName: "",
        width: 112,
        sortable: false,
        filterable: false,
        sticky: true,
        actionComponent: ({ row }) => {
          const r = row as GridRow;
          return (
            <div className="flex items-center justify-center gap-1">
              {r.trackId ? (
                <IconButton
                  icon="RefreshCw"
                  variant="action"
                  size="sm"
                  title="Consultar SII"
                  disabled={refreshBusyId === r.id}
                  onClick={() => void handleRefreshSii(r)}
                />
              ) : null}
              {r.envioStatus === "FAILED" || r.envioStatus === "PENDING" ? (
                <IconButton
                  icon="RotateCw"
                  variant="action"
                  size="sm"
                  title="Reenviar al SII (mismo folio)"
                  disabled={retryBusyId === r.id}
                  onClick={() => void handleRetry(r)}
                />
              ) : null}
              <IconButton
                icon="Eye"
                variant="action"
                size="sm"
                title="Ver venta"
                onClick={() => {
                  setDetailTxId(r.transactionId);
                  setDetailOpen(true);
                }}
              />
            </div>
          );
        },
      },
    );

    return cols;
  }, [handleRefreshSii, handleRetry, refreshBusyId, retryBusyId, showPackColumns]);

  const gridRows = useMemo(() => mapToGridRows(items), [items]);

  return (
    <>
      {showFilters ? (
        <div className="flex flex-wrap items-end gap-3 px-1 pb-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Estado SII</span>
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as EnvioFilter)}
            >
              <option value="">Todos</option>
              <option value="PENDING">Pendiente envío</option>
              <option value="SENDING">Enviando</option>
              <option value="EPR">Autorizado</option>
              <option value="RCH">Rechazado</option>
              <option value="SENT">Enviado (pendiente)</option>
              <option value="FAILED">Fallido envío</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Desde</span>
            <input
              type="date"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Hasta</span>
            <input
              type="date"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Folio</span>
            <input
              type="number"
              min={1}
              placeholder="Ej. 1234"
              className="w-28 rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={folioSearch}
              onChange={(e) => setFolioSearch(e.target.value)}
            />
          </label>
          <Button variant="secondary" onClick={applyFilters} disabled={isPending}>
            {isPending ? "Filtrando…" : "Aplicar filtros"}
          </Button>
        </div>
      ) : null}

      {error ? <p className="px-1 text-sm text-destructive">{error}</p> : null}
      {actionMessage ? <p className="px-1 text-sm text-green-600">{actionMessage}</p> : null}

      {total === 0 && !isPending ? (
        <p className="px-1 text-sm text-muted-foreground">
          Sin emisiones en este rango. Realice ventas con emisión habilitada en SII → Producción.
        </p>
      ) : null}

      <DataGrid
        title={title}
        columns={columns}
        rows={gridRows}
        totalRows={total}
        loading={isPending}
        paginationMode="controlled"
        page={page}
        limit={limit}
        onPaginationChange={({ page: nextPage, limit: nextLimit }) => fetchPage(nextPage, nextLimit)}
        height={embedded ? "50vh" : "85vh"}
        showBorder={false}
        showSearch={false}
        showSortButton={false}
        showFilterButton={false}
        showExportButton={false}
        pinActionsColumn
        data-test-id="fiscal-emissions-data-grid"
      />

      <SaleTransactionDetailDialog
        transactionId={detailTxId}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailTxId(null);
        }}
      />
    </>
  );
}
