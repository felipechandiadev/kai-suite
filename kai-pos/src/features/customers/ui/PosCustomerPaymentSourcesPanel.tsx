"use client";

import { DotProgress } from "@kai/ui";
import type {
  CustomerCreditNoteSource,
  CustomerPaymentSources,
} from "@/features/customers/types/customer-payment-sources.types";

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

type Props = {
  sources: CustomerPaymentSources;
  loading?: boolean;
  error?: string | null;
  showCreditNotes?: boolean;
  showOrderAdvances?: boolean;
  onApplyCreditNote?: (nc: CustomerCreditNoteSource) => void;
  usedCreditNoteIds?: ReadonlySet<string>;
  disabled?: boolean;
};

export default function PosCustomerPaymentSourcesPanel({
  sources,
  loading,
  error,
  showCreditNotes = true,
  showOrderAdvances = false,
  onApplyCreditNote,
  usedCreditNoteIds,
  disabled = false,
}: Props) {
  const hasNc = showCreditNotes && sources.creditNotes.length > 0;
  const hasAdv = showOrderAdvances && sources.orderAdvances.length > 0;

  if (loading) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground"
        data-test-id="pos-customer-payment-sources-loading"
      >
        <DotProgress />
        <span>Cargando notas de crédito y abonos…</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-destructive" data-test-id="pos-customer-payment-sources-error">
        {error}
      </p>
    );
  }

  if (!hasNc && !hasAdv) {
    return (
      <p
        className="text-xs text-muted-foreground"
        data-test-id="pos-customer-payment-sources-empty"
      >
        Sin notas de crédito ni abonos de encargo disponibles para aplicar como pago.
      </p>
    );
  }

  return (
    <div className="space-y-3" data-test-id="pos-customer-payment-sources">
      {hasNc ? (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Notas de crédito disponibles
          </h3>
          <ul className="mt-2 space-y-2">
            {sources.creditNotes.map((nc) => {
              const used = usedCreditNoteIds?.has(nc.id) ?? false;
              const noBalance = Math.round(nc.availableAmount) < 1;
              const rowDisabled = disabled || used || noBalance || !onApplyCreditNote;
              const rowClassName = used
                ? "cursor-default border-secondary/50 bg-secondary/10"
                : rowDisabled
                  ? "cursor-not-allowed border-border bg-transparent opacity-60"
                  : "cursor-pointer border-border bg-transparent hover:border-secondary/50 hover:bg-secondary/10";
              return (
                <li key={nc.id}>
                  <button
                    type="button"
                    disabled={rowDisabled}
                    onClick={() => onApplyCreditNote?.(nc)}
                    className={[
                      "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm text-left transition-colors",
                      rowClassName,
                    ].join(" ")}
                    data-test-id={`pos-customer-nc-${nc.id}`}
                    aria-label={`Aplicar nota de crédito ${nc.documentNumber}`}
                    aria-pressed={used}
                  >
                    <span className="font-mono font-medium text-foreground">
                      {nc.documentNumber}
                      {used ? (
                        <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                          (en uso)
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 tabular-nums font-semibold text-foreground">
                      {formatMoney(nc.availableAmount)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {hasAdv ? (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Abonos por encargo disponibles
          </h3>
          <ul className="mt-2 space-y-2">
            {sources.orderAdvances.map((bo) => (
              <li
                key={bo.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
                data-test-id={`pos-customer-advance-${bo.id}`}
              >
                <span className="font-mono font-medium text-foreground">{bo.documentNumber}</span>
                <span className="shrink-0 tabular-nums font-semibold text-foreground">
                  {formatMoney(bo.availableAmount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
