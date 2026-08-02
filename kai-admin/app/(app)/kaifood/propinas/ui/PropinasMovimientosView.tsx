"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Alert,
  DotProgress,
  Select,
  DataGridTable as DataGrid,
  type DataGridColumn,
} from "@kai/ui";
import { listTipLedgerAction } from "@/features/kaifood-tips/actions/kaifood-tips.action";
import type { TipLedgerEntryView } from "@/features/kaifood-tips/infrastructure/kaifood-tips.request";
import {
  formatTipClp,
  formatTipDateTime,
  tipCaptureStatusLabel,
  tipLedgerStatusLabel,
  tipPaymentMethodLabel,
} from "@/features/kaifood-tips/lib/tip-labels";
import {
  defaultPropinasPeriod,
  PropinasPeriodFilter,
  type PropinasPeriodValue,
} from "./PropinasPeriodFilter";

type GridRow = {
  id: string;
  fecha: string;
  monto: string;
  estado: string;
  captura: string;
  medio: string;
  mesero: string;
  venta: string;
};

const STATUS_FILTER_OPTIONS = [
  { id: "", label: "Todos" },
  { id: "ACCRUED", label: "Pendiente de pago" },
  { id: "PAID", label: "Pagada" },
];

const columns: DataGridColumn[] = [
  {
    field: "fecha",
    headerName: "Fecha",
    minWidth: 140,
    flex: 1,
    sortable: false,
    filterable: false,
  },
  {
    field: "monto",
    headerName: "Monto",
    width: 120,
    sortable: false,
    filterable: false,
  },
  {
    field: "estado",
    headerName: "Estado",
    minWidth: 140,
    flex: 1,
    sortable: false,
    filterable: false,
  },
  {
    field: "captura",
    headerName: "Captura",
    minWidth: 120,
    flex: 0.8,
    sortable: false,
    filterable: false,
  },
  {
    field: "medio",
    headerName: "Medio",
    minWidth: 130,
    flex: 1,
    sortable: false,
    filterable: false,
  },
  {
    field: "mesero",
    headerName: "Mesero",
    minWidth: 160,
    flex: 1.2,
    sortable: false,
    filterable: false,
  },
  {
    field: "venta",
    headerName: "Venta",
    width: 110,
    sortable: false,
    filterable: false,
  },
];

export function PropinasMovimientosView() {
  const [period, setPeriod] = useState<PropinasPeriodValue>(defaultPropinasPeriod);
  const [statusFilter, setStatusFilter] = useState("ACCRUED");
  const [rows, setRows] = useState<TipLedgerEntryView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => {
      void listTipLedgerAction({
        dateFrom: period.dateFrom,
        dateTo: period.dateTo,
        status: statusFilter || undefined,
      }).then((res) => {
        if (!res.success) {
          setError(res.message);
          return;
        }
        setError(null);
        setRows(res.data);
      });
    });
  }, [period.dateFrom, period.dateTo, statusFilter]);

  const gridRows: GridRow[] = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        fecha: formatTipDateTime(r.createdAt),
        monto: formatTipClp(Number(r.amount) || 0),
        estado: tipLedgerStatusLabel(r.status),
        captura: tipCaptureStatusLabel(r.tipStatus),
        medio: tipPaymentMethodLabel(r.paymentMethod),
        mesero: r.employeeName?.trim() || "Sin atribuir",
        venta: r.saleTransactionId
          ? `${r.saleTransactionId.slice(0, 8)}…`
          : "—",
      })),
    [rows],
  );

  return (
    <div
      className="flex flex-col gap-4 p-4 md:p-6"
      data-test-id="kaifood-propinas-movimientos"
    >
      <div>
        <h1 className="text-xl font-semibold">Movimientos de propinas</h1>
        <p className="text-sm text-muted-foreground">
          Detalle de propinas cobradas en el período.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <PropinasPeriodFilter value={period} onChange={setPeriod} />
        <Select
          label="Estado"
          alwaysShowLabel
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={(id) => setStatusFilter(String(id ?? ""))}
        />
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {pending ? <DotProgress aria-label="Cargando movimientos" /> : null}

      <DataGrid
        title="Movimientos"
        columns={columns}
        rows={gridRows}
        showFooter={false}
        data-test-id="kaifood-propinas-movimientos-grid"
      />
    </div>
  );
}
