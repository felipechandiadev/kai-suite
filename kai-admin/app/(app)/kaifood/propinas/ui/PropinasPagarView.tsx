"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Alert, Button, Select, TextField, DotProgress } from "@kai/ui";
import {
  createTipPayoutAction,
  getTipBalancesAction,
} from "@/features/kaifood-tips/actions/kaifood-tips.action";
import { formatTipClp } from "@/features/kaifood-tips/lib/tip-labels";

type Row = {
  employeeId: string;
  employeeName: string;
  openAmount: number;
  payAmount: string;
  selected: boolean;
};

export function PropinasPagarView() {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"TRANSFER" | "CASH" | "CHECK">(
    "TRANSFER",
  );
  const [pending, startTransition] = useTransition();

  const load = () => {
    startTransition(() => {
      void getTipBalancesAction().then((res) => {
        if (!res.success) {
          setError(res.message);
          return;
        }
        setError(null);
        setRows(
          res.data.byEmployee
            .filter((r) => r.employeeId && r.openAmount > 0)
            .map((r) => ({
              employeeId: r.employeeId as string,
              employeeName:
                r.employeeName?.trim() || "Trabajador sin nombre",
              openAmount: r.openAmount,
              payAmount: String(Math.round(r.openAmount)),
              selected: true,
            })),
        );
      });
    });
  };

  useEffect(() => {
    load();
  }, []);

  const submit = () => {
    setOk(null);
    setError(null);
    const lines = rows
      .filter((r) => r.selected)
      .map((r) => ({
        employeeId: r.employeeId,
        amount: Math.max(0, Math.round(Number(r.payAmount) || 0)),
      }))
      .filter((l) => l.amount > 0);
    if (lines.length === 0) {
      setError("Selecciona al menos un trabajador con monto");
      return;
    }
    startTransition(() => {
      void createTipPayoutAction({
        lines,
        paymentMethod,
        notes: "Pago de propinas",
      }).then((res) => {
        if (!res.success) {
          setError(res.message);
          return;
        }
        setOk(
          `Pago registrado · ${formatTipClp(res.data.total)} · ${res.data.lineCount} línea(s)`,
        );
        load();
      });
    });
  };

  return (
    <div
      className="flex flex-col gap-4 p-4 md:p-6"
      data-test-id="kaifood-propinas-pagar"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Pagar propinas
          </h1>
          <p className="text-sm text-muted-foreground">
            Genera un pago por trabajador con saldo atribuido. El pozo sin
            atribuir no se incluye: atribúyelo antes en Saldos.
          </p>
        </div>
        <Link href="/kaifood/propinas?tab=saldos" className="text-sm underline">
          Ver saldos
        </Link>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {ok ? <Alert variant="success">{ok}</Alert> : null}
      {pending ? <DotProgress aria-label="Procesando pago" /> : null}

      <Select
        label="Medio de pago"
        alwaysShowLabel
        value={paymentMethod}
        onChange={(id) =>
          setPaymentMethod(
            String(id ?? "TRANSFER") as "TRANSFER" | "CASH" | "CHECK",
          )
        }
        options={[
          { id: "TRANSFER", label: "Transferencia" },
          { id: "CASH", label: "Efectivo" },
          { id: "CHECK", label: "Cheque" },
        ]}
      />

      <ul className="divide-y divide-border rounded-xl border border-border">
        {rows.length === 0 && !pending ? (
          <li className="p-4 text-sm text-muted-foreground">
            No hay saldos atribuidos a personas. Usa atribución directa al cobro
            o calcula la atribución del pozo en Saldos.
          </li>
        ) : null}
        {rows.map((r) => (
          <li
            key={r.employeeId}
            className="flex flex-wrap items-end gap-3 px-4 py-3"
          >
            <label className="flex min-w-[12rem] flex-1 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={r.selected}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((x) =>
                      x.employeeId === r.employeeId
                        ? { ...x, selected: e.target.checked }
                        : x,
                    ),
                  )
                }
              />
              <span>
                {r.employeeName}
                <span className="block text-xs text-muted-foreground">
                  Abierto {formatTipClp(r.openAmount)}
                </span>
              </span>
            </label>
            <TextField
              label="Pagar"
              type="number"
              className="w-36"
              value={r.payAmount}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((x) =>
                    x.employeeId === r.employeeId
                      ? { ...x, payAmount: e.target.value }
                      : x,
                  ),
                )
              }
            />
          </li>
        ))}
      </ul>

      <Button
        variant="primary"
        disabled={pending || rows.length === 0}
        onClick={submit}
        data-test-id="kaifood-propinas-pagar-submit"
      >
        Confirmar pago
      </Button>
    </div>
  );
}
