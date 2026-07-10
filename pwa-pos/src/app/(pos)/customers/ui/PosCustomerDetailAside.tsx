"use client";

import type {
  PosCustomerDetail,
  PosCustomerPaymentRow,
  PosCustomerQuotaRow,
} from "@/features/customers/types/pos-customer-detail.types";
import { Alert } from "@kai/ui";

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="wrap-break-word text-sm text-foreground">{value || "—"}</dd>
    </div>
  );
}

export default function PosCustomerDetailAside(props: {
  invalidId: boolean;
  detailError: string | null;
  customer: PosCustomerDetail | null;
  payments: PosCustomerPaymentRow[];
  quotas: PosCustomerQuotaRow[];
  internalCreditEnabled?: boolean;
}) {
  const {
    invalidId,
    detailError,
    customer,
    payments,
    quotas,
    internalCreditEnabled = false,
  } = props;

  if (invalidId) {
    return (
      <aside
        className="flex min-h-0 w-full min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-sm lg:min-h-[76vh]"
        aria-label="Ficha de cliente"
      >
        <h2 className="text-sm font-semibold text-foreground">Ficha del cliente</h2>
        <Alert variant="error" className="text-sm">
          El identificador en la URL no es válido.
        </Alert>
      </aside>
    );
  }

  if (detailError) {
    return (
      <aside
        className="flex min-h-0 w-full min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-sm lg:min-h-[76vh]"
        aria-label="Ficha de cliente"
      >
        <h2 className="text-sm font-semibold text-foreground">Ficha del cliente</h2>
        <Alert variant="error" className="text-sm">
          {detailError}
        </Alert>
      </aside>
    );
  }

  if (!customer) {
    return (
      <aside
        className="flex min-h-0 w-full min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-sm lg:min-h-[76vh]"
        aria-label="Ficha de cliente"
      >
        <h2 className="text-sm font-semibold text-foreground">Ficha del cliente</h2>
        <p className="text-sm text-muted-foreground">
          Busca y elige un cliente en el panel izquierdo para ver su ficha
          {internalCreditEnabled ? ", línea de crédito, cuotas pendientes" : ""} e historial de pagos.
        </p>
      </aside>
    );
  }

  const doc =
    [customer.documentType, customer.documentNumber].filter(Boolean).join(" ").trim() || "—";

  return (
    <aside
      className="flex min-h-0 w-full min-w-0 flex-col gap-4 rounded-xl border border-border bg-background p-4 shadow-sm lg:min-h-[76vh]"
      aria-label="Ficha de cliente"
      data-test-id="pos-customer-detail-aside"
    >
      <header className="shrink-0">
        <h2 className="text-sm font-semibold text-foreground">Ficha del cliente</h2>
        <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">{customer.displayName}</p>
        <p className="text-xs text-muted-foreground">
          {customer.isActive ? "Activo" : "Inactivo"}
          {customer.createdAt ? ` · Alta ${fmtDate(customer.createdAt)}` : ""}
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contacto</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <DetailField label="Documento" value={doc} />
            <DetailField label="Teléfono" value={customer.phone ?? ""} />
            <DetailField label="Email" value={customer.email ?? ""} />
            <DetailField label="Dirección" value={customer.address ?? ""} />
          </dl>
          {customer.notes?.trim() ? (
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">Notas</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{customer.notes.trim()}</p>
            </div>
          ) : null}
        </section>

        {internalCreditEnabled ? (
          <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Crédito</h3>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <DetailField label="Límite" value={money.format(Math.round(customer.creditLimit))} />
              <DetailField label="Utilizado" value={money.format(Math.round(customer.usedCredit))} />
              <DetailField label="Disponible" value={money.format(Math.round(customer.availableCredit))} />
              <DetailField
                label="Día de pago"
                value={
                  customer.paymentDayOfMonth != null && Number.isFinite(customer.paymentDayOfMonth)
                    ? String(customer.paymentDayOfMonth)
                    : ""
                }
              />
            </dl>
          </section>
        ) : null}

        {internalCreditEnabled ? (
          <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Cuotas / documentos pendientes
            </h3>
          {quotas.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Sin cuotas pendientes registradas.</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-md text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Documento</th>
                    <th className="py-2 pr-2 font-medium">Vencimiento</th>
                    <th className="py-2 pr-2 text-right font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {quotas.map((q) => (
                    <tr key={q.id} className="border-b border-border/80">
                      <td className="py-2 pr-2 font-mono text-xs">{q.documentNumber ?? q.transactionId ?? "—"}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{fmtDate(q.dueDate)}</td>
                      <td className="py-2 text-right tabular-nums font-medium">{money.format(Math.round(q.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </section>
        ) : null}

        <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Historial de pagos</h3>
          {payments.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Sin movimientos de cobro registrados.</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-lg text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Fecha</th>
                    <th className="py-2 pr-2 font-medium">Documento</th>
                    <th className="py-2 pr-2 font-medium">Tipo</th>
                    <th className="py-2 pr-2 font-medium">Estado</th>
                    <th className="py-2 pr-2 font-medium">Medio</th>
                    <th className="py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-border/80">
                      <td className="py-2 pr-2 text-muted-foreground">{fmtDate(p.createdAt)}</td>
                      <td className="py-2 pr-2 font-mono text-xs">{p.documentNumber ?? "—"}</td>
                      <td className="py-2 pr-2">{p.type ?? "—"}</td>
                      <td className="py-2 pr-2">{p.status ?? "—"}</td>
                      <td className="py-2 pr-2">{p.paymentMethod ?? "—"}</td>
                      <td className="py-2 text-right tabular-nums font-medium">{money.format(Math.round(p.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
