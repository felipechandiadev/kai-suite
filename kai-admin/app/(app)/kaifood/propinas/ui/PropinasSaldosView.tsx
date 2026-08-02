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
import {
  attributeTipsAction,
  getTipBalancesAction,
} from "@/features/kaifood-tips/actions/kaifood-tips.action";
import { formatTipClp } from "@/features/kaifood-tips/lib/tip-labels";

type BalanceRow = {
  employeeId: string | null;
  employeeName?: string | null;
  openAmount: number;
  entryCount: number;
};

type GridRow = {
  id: string;
  mesero: string;
  cobros: string;
  saldo: string;
};

const columns: DataGridColumn[] = [
  {
    field: "mesero",
    headerName: "Mesero",
    minWidth: 200,
    flex: 1.5,
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
  {
    field: "saldo",
    headerName: "Saldo abierto",
    minWidth: 140,
    flex: 1,
    sortable: false,
    filterable: false,
  },
];

export function PropinasSaldosView() {
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [poolOpen, setPoolOpen] = useState(0);
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [pending, startTransition] = useTransition();

  const load = () => {
    startTransition(() => {
      void getTipBalancesAction().then((res) => {
        if (!res.success) {
          setError(res.message);
          return;
        }
        setError(null);
        setPoolOpen(res.data.poolOpen);
        setRows(res.data.byEmployee);
      });
    });
  };

  useEffect(() => {
    load();
  }, []);

  const runAttribute = () => {
    setMsg(null);
    startTransition(() => {
      void attributeTipsAction().then((res) => {
        if (!res.success) {
          setError(res.message);
          return;
        }
        setError(null);
        setMsg(
          `Atribuidos ${res.data.attributedCount} cobros · ${formatTipClp(res.data.attributedTotal)}`,
        );
        load();
      });
    });
  };

  const gridRows: GridRow[] = useMemo(
    () =>
      rows.map((r) => ({
        id: r.employeeId ?? "pozo",
        mesero: r.employeeId
          ? r.employeeName?.trim() || "Trabajador sin nombre"
          : "Sin atribuir (pozo)",
        cobros: String(r.entryCount),
        saldo: formatTipClp(r.openAmount),
      })),
    [rows],
  );

  return (
    <div
      className="flex flex-col gap-4 p-4 md:p-6"
      data-test-id="kaifood-propinas-saldos"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Saldos por persona
          </h1>
          <p className="text-sm text-muted-foreground">
            En modo directo se asigna al cobro. En pozo o puntos, usa «Calcular
            atribución» según el acuerdo de trabajadores.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Button
            size="sm"
            variant="outlined"
            onClick={runAttribute}
            disabled={pending}
          >
            Calcular atribución
          </Button>
          <Link href="/kaifood/propinas?tab=pagar" className="underline">
            Ir a pagar
          </Link>
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {msg ? <Alert variant="info">{msg}</Alert> : null}
      {pending ? <DotProgress aria-label="Cargando saldos" /> : null}

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Pozo sin atribuir
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {formatTipClp(poolOpen)}
        </p>
      </div>

      <DataGrid
        title="Saldos"
        columns={columns}
        rows={gridRows}
        showFooter={false}
        data-test-id="kaifood-propinas-saldos-grid"
      />
    </div>
  );
}
