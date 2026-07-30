"use client";

import {
  SALES_PAYMENT_METHOD_LABEL,
  type SalesPaymentMethod,
} from "@/features/sales-payments/types/sales-payment.types";
import type { PaymentSnapshotRow } from "../types/sale-transaction-detail.types";

type Props = {
  payments: PaymentSnapshotRow[];
};

function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function methodLabel(method: string, alias: string | null): string {
  if (alias?.trim()) return alias.trim();
  const key = method as SalesPaymentMethod;
  return SALES_PAYMENT_METHOD_LABEL[key] ?? method;
}

export default function SalePaymentsBreakdownTable({ payments }: Props) {
  if (payments.length === 0) return null;

  return (
    <section className="rounded-md border border-border" data-test-id="sale-payments-breakdown">
      <h3 className="border-b border-border bg-muted/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Medios de pago
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-3 py-2 font-medium">Medio</th>
              <th className="px-3 py-2 font-medium text-right">Monto</th>
              <th className="px-3 py-2 font-medium">Referencia</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p, idx) => (
              <tr key={`${p.method}-${idx}`} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2">{methodLabel(p.method, p.alias)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">
                  {formatMoney(p.amount)}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{p.reference ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
