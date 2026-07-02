"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import DataGrid from "@/shared/components/DataGrid/DataGrid";
import type { DataGridColumn } from "@/shared/components/DataGrid/DataGrid";
import Badge, { type BadgeVariant } from "@/shared/components/Badge/Badge";
import IconButton from "@/shared/components/IconButton/IconButton";
import { Button } from "@/shared/components/Button";
import {
  listFiscalEmissionsAction,
  refreshFiscalEmissionSiiStatusAction,
  retryFiscalBoletaEmissionAction,
} from "../actions/fiscal.actions";
import type { FiscalEmissionRow, FiscalEmissionsListParams } from "../types/fiscal.types";
import {
  SALES_PAYMENT_METHOD_LABEL,
  type SalesPaymentMethod,
} from "@/features/sales-payments/types/sales-payment.types";
import SaleTransactionDetailDialog from "../../../../app/(app)/sales/transactions/ui/SaleTransactionDetailDialog";

type EnvioFilter = "" | "SENT" | "FAILED" | "EPR" | "RCH";

type Props = {
  initialItems: FiscalEmissionRow[];
  initialTotal: number;
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

export function FiscalEmissionsDataGrid({ initialItems, initialTotal }: Props) {
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [statusFilter, setStatusFilter] = useState<EnvioFilter>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [folioSearch, setFolioSearch] = useState("");
  const [appliedFolio, setAppliedFolio] = useState<number | undefined>(undefined);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [retryBusyId, setRetryBusyId] = useState<string | null>(null);
  const [refreshBusyId, setRefreshBusyId] = useState<string | null>(null);
  const [detailTxId, setDetailTxId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const buildParams = useCallback(
    (nextPage: number, nextLimit: number): FiscalEmissionsListParams => ({
      limit: nextLimit,
      offset: (nextPage - 1) * nextLimit,
      status: statusFilter || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
      folio: appliedFolio,
      environment: "production",
    }),
    [statusFilter, fromDate, toDate, appliedFolio],
  );

  const fetchPage = useCallback(
    (nextPage: number, nextLimit: number) => {
      startTransition(async () => {
        setError("");
        const res = await listFiscalEmissionsAction(buildParams(nextPage, nextLimit));
        if (!res.success) {
          setError(res.error);
          return;
        }
        setItems(res.items);
        setTotal(res.total);
        setPage(nextPage);
        setLimit(nextLimit);
      });
    },
    [buildParams],
  );

  const applyFilters = useCallback(() => {
    const folioNum = folioSearch.trim() ? Number(folioSearch.trim()) : undefined;
    setAppliedFolio(folioNum != null && Number.isFinite(folioNum) ? folioNum : undefined);
    startTransition(async () => {
      setError("");
      const params: FiscalEmissionsListParams = {
        limit,
        offset: 0,
        status: statusFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        folio: folioNum != null && Number.isFinite(folioNum) ? folioNum : undefined,
        environment: "production",
      };
      const res = await listFiscalEmissionsAction(params);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setItems(res.items);
      setTotal(res.total);
      setPage(1);
    });
  }, [folioSearch, fromDate, limit, statusFilter, toDate]);

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
      fetchPage(page, limit);
    },
    [fetchPage, limit, page],
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
    [],
  );

  const columns: DataGridColumn[] = useMemo(
    () => [
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
              {r.envioStatus === "FAILED" ? (
                <IconButton
                  icon="RotateCw"
                  variant="action"
                  size="sm"
                  title="Reintentar envío"
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
    ],
    [handleRefreshSii, handleRetry, refreshBusyId, retryBusyId],
  );

  const gridRows = useMemo(() => mapToGridRows(items), [items]);

  return (
    <>
      <div className="flex flex-wrap items-end gap-3 px-1 pb-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Estado SII</span>
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EnvioFilter)}
          >
            <option value="">Todos</option>
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

      {error ? <p className="px-1 text-sm text-destructive">{error}</p> : null}
      {actionMessage ? <p className="px-1 text-sm text-green-600">{actionMessage}</p> : null}

      {total === 0 && !isPending ? (
        <p className="px-1 text-sm text-muted-foreground">
          Sin emisiones de producción. Realice ventas con emisión habilitada en SII → Producción.
        </p>
      ) : null}

      <DataGrid
        title="Folios emitidos"
        columns={columns}
        rows={gridRows}
        totalRows={total}
        loading={isPending}
        paginationMode="controlled"
        page={page}
        limit={limit}
        onPaginationChange={({ page: nextPage, limit: nextLimit }) => fetchPage(nextPage, nextLimit)}
        height="85vh"
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
