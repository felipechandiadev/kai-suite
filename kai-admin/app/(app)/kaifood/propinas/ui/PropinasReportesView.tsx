"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Alert,
  DotProgress,
  DataGridTable as DataGrid,
  type DataGridColumn,
} from "@kai/ui";
import {
  getTipSummaryAction,
  listTipLedgerAction,
} from "@/features/kaifood-tips/actions/kaifood-tips.action";
import {
  formatTipClp,
  formatTipDate,
} from "@/features/kaifood-tips/lib/tip-labels";
import {
  defaultPropinasPeriod,
  PropinasPeriodFilter,
  type PropinasPeriodValue,
} from "./PropinasPeriodFilter";

type DayRow = {
  id: string;
  dia: string;
  total: string;
  cobros: string;
};

type WaiterRow = {
  id: string;
  mesero: string;
  total: string;
  cobros: string;
  pendiente: string;
};

const dayColumns: DataGridColumn[] = [
  {
    field: "dia",
    headerName: "Día",
    minWidth: 120,
    flex: 1,
    sortable: false,
    filterable: false,
  },
  {
    field: "total",
    headerName: "Total propinas",
    minWidth: 140,
    flex: 1,
    sortable: false,
    filterable: false,
  },
  {
    field: "cobros",
    headerName: "Cobros",
    width: 100,
    sortable: false,
    filterable: false,
  },
];

const waiterColumns: DataGridColumn[] = [
  {
    field: "mesero",
    headerName: "Mesero",
    minWidth: 180,
    flex: 1.4,
    sortable: false,
    filterable: false,
  },
  {
    field: "total",
    headerName: "Total período",
    minWidth: 130,
    flex: 1,
    sortable: false,
    filterable: false,
  },
  {
    field: "pendiente",
    headerName: "Pendiente de pago",
    minWidth: 140,
    flex: 1,
    sortable: false,
    filterable: false,
  },
  {
    field: "cobros",
    headerName: "Cobros",
    width: 100,
    sortable: false,
    filterable: false,
  },
];

export function PropinasReportesView() {
  const [period, setPeriod] = useState<PropinasPeriodValue>(defaultPropinasPeriod);
  const [byDay, setByDay] = useState<
    Array<{ date: string; total: number; count: number }>
  >([]);
  const [accruedTotal, setAccruedTotal] = useState(0);
  const [accruedCount, setAccruedCount] = useState(0);
  const [overdueTotal, setOverdueTotal] = useState(0);
  const [waiterAgg, setWaiterAgg] = useState<
    Array<{
      key: string;
      name: string;
      total: number;
      open: number;
      count: number;
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => {
      void Promise.all([
        getTipSummaryAction({
          dateFrom: period.dateFrom,
          dateTo: period.dateTo,
        }),
        listTipLedgerAction({
          dateFrom: period.dateFrom,
          dateTo: period.dateTo,
        }),
      ]).then(([summaryRes, ledgerRes]) => {
        if (!summaryRes.success) {
          setError(summaryRes.message);
          return;
        }
        if (!ledgerRes.success) {
          setError(ledgerRes.message);
          return;
        }
        setError(null);
        setByDay(summaryRes.data.byDay);
        setAccruedTotal(summaryRes.data.accruedTotal);
        setAccruedCount(summaryRes.data.accruedCount);
        setOverdueTotal(summaryRes.data.overdueTotal ?? 0);

        const map = new Map<
          string,
          { name: string; total: number; open: number; count: number }
        >();
        for (const e of ledgerRes.data) {
          const key = e.employeeId?.trim() || "pozo";
          const name = e.employeeName?.trim() || "Sin atribuir";
          const amount = Number(e.amount) || 0;
          const paid = Number(e.amountPaid) || 0;
          const open = Math.max(0, amount - paid);
          const cur = map.get(key) ?? {
            name,
            total: 0,
            open: 0,
            count: 0,
          };
          cur.total += amount;
          cur.open += open;
          cur.count += 1;
          if (e.employeeName?.trim()) cur.name = e.employeeName.trim();
          map.set(key, cur);
        }
        setWaiterAgg(
          [...map.entries()]
            .map(([key, v]) => ({ key, ...v }))
            .sort((a, b) => b.total - a.total),
        );
      });
    });
  }, [period.dateFrom, period.dateTo]);

  const dayRows: DayRow[] = useMemo(
    () =>
      byDay.map((d) => ({
        id: d.date,
        dia: formatTipDate(`${d.date}T12:00:00.000Z`),
        total: formatTipClp(d.total),
        cobros: String(d.count),
      })),
    [byDay],
  );

  const waiterRows: WaiterRow[] = useMemo(
    () =>
      waiterAgg.map((w) => ({
        id: w.key,
        mesero: w.name,
        total: formatTipClp(w.total),
        pendiente: formatTipClp(w.open),
        cobros: String(w.count),
      })),
    [waiterAgg],
  );

  return (
    <div
      className="flex flex-col gap-4 p-4 md:p-6"
      data-test-id="kaifood-propinas-reportes"
    >
      <div>
        <h1 className="text-xl font-semibold">Reportes de propinas</h1>
        <p className="text-sm text-muted-foreground">
          Totales del período, por día y por mesero (fuera de reportes de
          ventas).
        </p>
      </div>

      <PropinasPeriodFilter value={period} onChange={setPeriod} />

      {error ? <Alert variant="error">{error}</Alert> : null}
      {pending ? <DotProgress aria-label="Cargando reportes" /> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Pendiente de pago
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatTipClp(accruedTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Cobros con propina
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{accruedCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Vencido (tarjeta)
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatTipClp(overdueTotal)}
          </p>
        </div>
      </div>

      <DataGrid
        title="Por día"
        columns={dayColumns}
        rows={dayRows}
        showFooter={false}
        data-test-id="kaifood-propinas-reportes-day-grid"
      />

      <DataGrid
        title="Por mesero"
        columns={waiterColumns}
        rows={waiterRows}
        showFooter={false}
        data-test-id="kaifood-propinas-reportes-waiter-grid"
      />
    </div>
  );
}
