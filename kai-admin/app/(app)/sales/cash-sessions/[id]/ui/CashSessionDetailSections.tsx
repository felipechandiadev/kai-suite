"use client";

import { TextField } from "@kai/ui";
import type { CashSessionDetail } from "@/features/sales-cash-sessions/types/cash-session-detail.types";
import type { CashSessionMovementRow } from "@/features/sales-cash-sessions/types/cash-session-movement.types";
import { CASH_SESSION_STATUS_LABEL } from "@/features/sales-cash-sessions/types/cash-session-list.types";
import { getTransactionTypeLabel } from "@/features/transactions/types/transaction-types";
import {
  SALES_PAYMENT_METHOD_LABEL,
  type SalesPaymentMethod,
} from "@/features/sales-payments/types/sales-payment.types";

function noop() {}

function formatMoney(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
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

function paymentMethodLabel(method: string): string {
  if (!method || method === "—") return "—";
  const m = method as SalesPaymentMethod;
  return SALES_PAYMENT_METHOD_LABEL[m] ?? method;
}

const DIRECTION_LABEL: Record<string, string> = {
  IN: "Entrada",
  OUT: "Salida",
  NEUTRAL: "Neutral",
};

export function CashSessionDetailResumenSection({
  session,
}: {
  session: CashSessionDetail;
}) {
  const openedBy =
    session.openedByFullName ?? session.openedByUserName ?? "—";
  const closedBy =
    session.closedByFullName ?? session.closedByUserName ?? "—";
  const balanceInCash = session.expectedAmount ?? session.openingAmount;

  return (
    <div
      className="relative space-y-3 rounded-lg border border-border bg-background p-4"
      data-test-id="cash-session-detail-resumen"
    >
      <p className="text-xs font-medium text-foreground">Datos de la sesión</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Estado"
          name="cs-status"
          value={CASH_SESSION_STATUS_LABEL[session.status] ?? session.status}
          onChange={noop}
          readOnly
          data-test-id="cash-session-detail-field-status"
        />
        <TextField
          label="Sucursal"
          name="cs-branch"
          value={session.branchName ?? "—"}
          onChange={noop}
          readOnly
          data-test-id="cash-session-detail-field-branch"
        />
        <TextField
          label="Punto de venta"
          name="cs-pos"
          value={session.pointOfSaleName ?? "—"}
          onChange={noop}
          readOnly
          data-test-id="cash-session-detail-field-pos"
        />
        <TextField
          label="Abierta por"
          name="cs-opened-by"
          value={openedBy}
          onChange={noop}
          readOnly
          data-test-id="cash-session-detail-field-opened-by"
        />
        <TextField
          label="Apertura"
          name="cs-opened-at"
          value={formatDateTimeSlash(session.openedAt)}
          onChange={noop}
          readOnly
          data-test-id="cash-session-detail-field-opened-at"
        />
        <TextField
          label="Monto apertura"
          name="cs-opening-amount"
          value={formatMoney(session.openingAmount)}
          onChange={noop}
          readOnly
          data-test-id="cash-session-detail-field-opening-amount"
        />
        <TextField
          label="Saldo en caja"
          name="cs-balance"
          value={formatMoney(balanceInCash)}
          onChange={noop}
          readOnly
          data-test-id="cash-session-detail-field-balance"
        />
        <TextField
          label="Total ventas"
          name="cs-sales-total"
          value={formatMoney(session.salesTotal)}
          onChange={noop}
          readOnly
          data-test-id="cash-session-detail-field-sales-total"
        />
        <TextField
          label="Cierre"
          name="cs-closed-at"
          value={formatDateTimeSlash(session.closedAt)}
          onChange={noop}
          readOnly
          data-test-id="cash-session-detail-field-closed-at"
        />
        <TextField
          label="Cerrada por"
          name="cs-closed-by"
          value={closedBy}
          onChange={noop}
          readOnly
          data-test-id="cash-session-detail-field-closed-by"
        />
        <TextField
          label="Monto cierre"
          name="cs-closing-amount"
          value={formatMoney(session.closingAmount)}
          onChange={noop}
          readOnly
          data-test-id="cash-session-detail-field-closing-amount"
        />
        <TextField
          label="Diferencia"
          name="cs-difference"
          value={formatMoney(session.difference)}
          onChange={noop}
          readOnly
          data-test-id="cash-session-detail-field-difference"
        />
      </div>
    </div>
  );
}

export function CashSessionDetailMovimientosSection({
  movements,
}: {
  movements: CashSessionMovementRow[];
}) {
  if (movements.length === 0) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-test-id="cash-session-detail-movimientos-empty"
      >
        No hay transacciones en esta sesión.
      </p>
    );
  }

  return (
    <div
      className="overflow-auto rounded-lg border border-border"
      data-test-id="cash-session-detail-movimientos"
    >
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left">
            <th className="whitespace-nowrap px-3 py-2 font-medium">Fecha</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">Folio</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">Tipo</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">Sentido</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">Usuario</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">
              Medio pago
            </th>
            <th className="whitespace-nowrap px-3 py-2 text-right font-medium">
              Total
            </th>
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
              <td className="px-3 py-2">
                {getTransactionTypeLabel(m.transactionType)}
              </td>
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
  );
}
