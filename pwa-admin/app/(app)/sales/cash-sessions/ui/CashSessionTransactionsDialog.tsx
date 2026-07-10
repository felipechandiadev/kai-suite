"use client";
import { LoadingState } from '@kai/ui';

import { useEffect, useState } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { getCashSessionDetailAction } from "@/features/sales-cash-sessions/actions/cash-session-detail.action";
import type { CashSessionListRow } from "@/features/sales-cash-sessions/types/cash-session-list.types";
import type { CashSessionMovementRow } from "@/features/sales-cash-sessions/types/cash-session-movement.types";
import { getTransactionTypeLabel } from "@/features/transactions/types/transaction-types";
import {
  SALES_PAYMENT_METHOD_LABEL,
  type SalesPaymentMethod,
} from "@/features/sales-payments/types/sales-payment.types";

type Props = {
  session: CashSessionListRow | null;
  open: boolean;
  onClose: () => void;
};

function paymentMethodLabel(method: string): string {
  if (!method || method === "—") return "—";
  const m = method as SalesPaymentMethod;
  return SALES_PAYMENT_METHOD_LABEL[m] ?? method;
}

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

function formatDateTimeSlash(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const dt = new Date(value.trim());
  if (Number.isNaN(dt.getTime())) return "—";
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
}

const DIRECTION_LABEL: Record<string, string> = {
  IN: "Entrada",
  OUT: "Salida",
  NEUTRAL: "Neutral",
};

export default function CashSessionTransactionsDialog({
  session,
  open,
  onClose,
}: Props) {
  const [movements, setMovements] = useState<CashSessionMovementRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !session?.id) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setMovements([]);
    void getCashSessionDetailAction(session.id).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success) {
        setMovements(res.movements);
      } else {
        setError(res.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, session?.id]);

  const titleSuffix = session?.pointOfSaleName?.trim()
    ? ` — ${session.pointOfSaleName.trim()}`
    : "";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Transacciones de la sesión${titleSuffix}`}
      size="xl"
      scroll="paper"
      maxHeight="min(80vh, 640px)"
      showCloseButton
      hideActions
      data-test-id="cash-session-transactions-dialog"
      contentStyle={{ padding: 0 }}
    >
      <div className="flex flex-col gap-3 p-4">
        {session ? (
          <p className="text-sm text-muted-foreground">
            Sesión del{" "}
            <span className="font-medium text-foreground">
              {formatDateTimeSlash(session.openedAt)}
            </span>
            {session.branchName ? (
              <>
                {" "}
                · Sucursal:{" "}
                <span className="font-medium text-foreground">{session.branchName}</span>
              </>
            ) : null}
          </p>
        ) : null}

        {loading ? (
          <LoadingState className="flex items-center justify-center py-4" label="Cargando movimientos" data-test-id="cash-session-tx-loading" />
        ) : null}

        {error ? (
          <Alert variant="error" data-test-id="cash-session-tx-error">
            {error}
          </Alert>
        ) : null}

        {!loading && !error && movements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay transacciones en esta sesión.</p>
        ) : null}

        {!loading && movements.length > 0 ? (
          <div
            className="overflow-auto rounded-md border border-border"
            data-test-id="cash-session-tx-table-wrap"
          >
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Fecha</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Folio</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Tipo</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Sentido</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Usuario</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Medio pago</th>
                  <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {formatDateTimeSlash(m.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                      {m.documentNumber}
                    </td>
                    <td className="px-3 py-2">{getTransactionTypeLabel(m.transactionType)}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {DIRECTION_LABEL[m.direction] ?? m.direction}
                    </td>
                    <td className="min-w-[140px] px-3 py-2">
                      {m.userFullName ?? m.userUserName ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {paymentMethodLabel(m.paymentMethod)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {formatMoney(m.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
