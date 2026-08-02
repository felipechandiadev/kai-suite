"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  DotProgress,
  DataGridTable as DataGrid,
  type DataGridColumn,
} from "@kai/ui";
import { getTipOverdueAction } from "@/features/kaifood-tips/actions/kaifood-tips.action";
import {
  formatTipClp,
  formatTipDate,
  formatTipDateTime,
  tipPaymentMethodLabel,
} from "@/features/kaifood-tips/lib/tip-labels";

type Item = {
  id: string;
  amount: string | number;
  dueAt?: string | null;
  paymentMethod?: string | null;
  employeeName?: string | null;
  createdAt: string;
};

type GridRow = {
  id: string;
  fecha: string;
  vencimiento: string;
  medio: string;
  mesero: string;
  monto: string;
};

const columns: DataGridColumn[] = [
  {
    field: "fecha",
    headerName: "Fecha cobro",
    minWidth: 140,
    flex: 1,
    sortable: false,
    filterable: false,
  },
  {
    field: "vencimiento",
    headerName: "Vencimiento",
    minWidth: 120,
    flex: 0.9,
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
    field: "monto",
    headerName: "Monto",
    width: 120,
    sortable: false,
    filterable: false,
  },
];

export function PropinasPendientesView() {
  const [error, setError] = useState<string | null>(null);
  const [overdueTotal, setOverdueTotal] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [pending, startTransition] = useTransition();

  const load = () => {
    startTransition(() => {
      void getTipOverdueAction().then((res) => {
        if (!res.success) {
          setError(res.message);
          return;
        }
        setError(null);
        setOverdueTotal(res.data.overdueTotal);
        setOverdueCount(res.data.overdueCount);
        setItems(
          (res.data.items ?? []).map((i) => ({
            id: i.id,
            amount: i.amount,
            dueAt: i.dueAt ?? null,
            paymentMethod: i.paymentMethod,
            employeeName: i.employeeName,
            createdAt: i.createdAt,
          })),
        );
      });
    });
  };

  useEffect(() => {
    load();
  }, []);

  const gridRows: GridRow[] = useMemo(
    () =>
      items.map((i) => ({
        id: i.id,
        fecha: formatTipDateTime(i.createdAt),
        vencimiento: formatTipDate(i.dueAt),
        medio: tipPaymentMethodLabel(i.paymentMethod),
        mesero: i.employeeName?.trim() || "Sin atribuir",
        monto: formatTipClp(Number(i.amount) || 0),
      })),
    [items],
  );

  return (
    <div
      className="flex flex-col gap-4 p-4 md:p-6"
      data-test-id="kaifood-propinas-pendientes"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Propinas vencidas
          </h1>
          <p className="text-sm text-muted-foreground">
            Propinas con tarjeta aún no pagadas a los trabajadores, cuyo plazo
            legal de 7 días hábiles ya venció (Art. 64).
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Button size="sm" variant="outlined" onClick={load} disabled={pending}>
            Actualizar
          </Button>
          <Link href="/kaifood/propinas?tab=pagar" className="underline">
            Ir a pagar
          </Link>
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {pending ? <DotProgress aria-label="Cargando vencidos" /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Monto vencido
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatTipClp(overdueTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Cobros vencidos
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{overdueCount}</p>
        </div>
      </div>

      <DataGrid
        title="Vencidos"
        columns={columns}
        rows={gridRows}
        showFooter={false}
        data-test-id="kaifood-propinas-pendientes-grid"
      />
    </div>
  );
}
