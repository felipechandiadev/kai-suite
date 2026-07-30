"use client";

import { formatMoney } from "@/features/pos-products/ui/posProductPreview";
import type { LaundryPendingCheckout } from "@/features/laundry/lib/laundry-pending-checkout";

type Props = {
  pending: LaundryPendingCheckout;
};

export default function LaundryReceptionPaymentSummary({ pending }: Props) {
  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto" data-test-id="laundry-payment-summary">
      {pending.garments.map((garment, index) => (
        <div
          key={garment.key}
          className="rounded-lg border border-border/70 px-3 py-2"
          data-test-id={`laundry-payment-summary-garment-${index}`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              {garment.garmentTypeName || "Prenda"} × {garment.quantity}
            </p>
            <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
              {formatMoney(garment.subtotal)}
            </span>
          </div>
          <ul className="mt-1.5 space-y-1">
            {garment.serviceLines.map((line) => (
              <li
                key={`${line.productVariantId}-${line.productName}`}
                className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
              >
                <span className="min-w-0 truncate">{line.productName}</span>
                <span className="shrink-0 tabular-nums">
                  {garment.quantity > 1
                    ? `${garment.quantity} × ${line.quantity} × ${formatMoney(line.unitPrice)}`
                    : `${line.quantity} × ${formatMoney(line.unitPrice)}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
        <span className="font-semibold text-foreground">Total servicios</span>
        <span
          className="font-semibold tabular-nums text-foreground"
          data-test-id="laundry-payment-summary-total"
        >
          {formatMoney(pending.servicesTotal)}
        </span>
      </div>
      {pending.charge === "deposit" ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Abono a cobrar ahora</span>
          <span className="font-medium tabular-nums text-foreground">
            {formatMoney(pending.expectedPaidTotal)}
          </span>
        </div>
      ) : null}
      {pending.charge === "none" ? (
        <p className="text-xs text-muted-foreground">Pago al retirar — sin cobro ahora.</p>
      ) : null}
    </div>
  );
}
