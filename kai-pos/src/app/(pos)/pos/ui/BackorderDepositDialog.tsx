"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Dialog, TextField } from "@kai/ui";
import type { BackorderDepositConfig } from "@/features/pos-cart/types/backorder-deposit.types";
import {
  clampDepositAmount,
  clampDepositPercent,
  depositAmountFromPercent,
} from "@/features/pos-cart/lib/backorder-deposit";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Total de la venta en curso (con descuentos aplicados). */
  saleTotal: number;
  initial?: BackorderDepositConfig | null;
  onConfirm: (config: BackorderDepositConfig) => void;
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function parsePercentInput(raw: string): number {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

function parseAmountCLP(raw: string): number {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

const DEFAULT_PERCENT = 0;

export function BackorderDepositDialog({
  open,
  onClose,
  saleTotal,
  initial,
  onConfirm,
}: Props) {
  const percentFieldRef = useRef<HTMLDivElement>(null);
  const [percentStr, setPercentStr] = useState(String(DEFAULT_PERCENT));
  const [amountStr, setAmountStr] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const percent = useMemo(() => clampDepositPercent(parsePercentInput(percentStr)), [percentStr]);

  const computedFromPercent = useMemo(
    () => depositAmountFromPercent(saleTotal, percent),
    [saleTotal, percent],
  );

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      setError(null);
      const p = initial?.percent ?? DEFAULT_PERCENT;
      const amt =
        initial?.amount != null && initial.amount > 0
          ? clampDepositAmount(initial.amount, saleTotal)
          : depositAmountFromPercent(saleTotal, p);
      setPercentStr(String(clampDepositPercent(p)));
      setAmountStr(String(amt));
      setAmountTouched(false);
    }, 0);
    return () => clearTimeout(id);
  }, [open, initial, saleTotal]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      percentFieldRef.current?.querySelector<HTMLInputElement>("input")?.focus({
        preventScroll: true,
      });
    }, 80);
    return () => clearTimeout(t);
  }, [open]);

  function handlePercentChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const next = (e as React.ChangeEvent<HTMLInputElement>).target.value;
    setPercentStr(next);
    if (!amountTouched) {
      const p = clampDepositPercent(parsePercentInput(next));
      setAmountStr(String(depositAmountFromPercent(saleTotal, p)));
    }
  }

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setAmountStr((e as React.ChangeEvent<HTMLInputElement>).target.value);
    setAmountTouched(true);
  }

  function handleConfirm() {
    setError(null);
    if (saleTotal <= 0) {
      setError("El total de la venta debe ser mayor que cero.");
      return;
    }
    const p = clampDepositPercent(parsePercentInput(percentStr));
    const amount = clampDepositAmount(parseAmountCLP(amountStr), saleTotal);
    // Permitir 0% / $0: encargo sin abono (solo reserva).
    onConfirm({ percent: p, amount });
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Abono de encargo"
      size="sm"
      alertArea={error ? <Alert variant="error">{error}</Alert> : undefined}
      actions={
        <>
          <Button type="button" variant="outlined" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={handleConfirm}>
            Aplicar abono
          </Button>
        </>
      }
      data-test-id="pos-backorder-deposit-dialog"
    >
      <div className="grid gap-3 text-sm">
        <p className="text-muted-foreground">
          Total de la venta:{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {formatMoney(saleTotal)}
          </span>
        </p>
        <div ref={percentFieldRef}>
          <TextField
            label="Porcentaje de abono (%)"
            type="number"
            min={0}
            max={100}
            value={percentStr}
            onChange={handlePercentChange}
            data-test-id="pos-backorder-deposit-percent"
          />
        </div>
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Monto según el % (redondeado)</p>
          <p
            className="mt-0.5 text-base font-semibold tabular-nums text-foreground"
            data-test-id="pos-backorder-deposit-computed"
          >
            {formatMoney(computedFromPercent)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            En pesos chilenos no hay decimales; puede ajustar el monto abajo si lo necesita.
          </p>
        </div>
        <TextField
          label="Monto de abono"
          type="currency"
          startSymbol="$"
          currencySymbol="$"
          value={amountStr}
          onChange={handleAmountChange}
          data-test-id="pos-backorder-deposit-amount"
        />
      </div>
    </Dialog>
  );
}
