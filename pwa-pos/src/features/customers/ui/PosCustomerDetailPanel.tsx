"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Dialog, IconButton } from "@/shared/admin-shared";
import { Badge } from "@/shared/components/Badge";
import { writePosArCollectDraft } from "@/features/session/lib/pos-ar-collect-storage";
import { writePosNcPayoutDraft } from "@/features/session/lib/pos-nc-payout-storage";
import { writePosQuotaCollectDraft } from "@/features/session/lib/pos-quota-collect-storage";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import { getBackorderDetailPosAction, getCustomerPosDetailBundleAction } from "@/features/customers/actions/customers-pos.action";
import type {
  PosCustomerDetail,
  PosCustomerBackorderRow,
  PosCustomerDetailBundle,
  PosCustomerCreditNoteRow,
  PosCustomerPaymentRow,
  PosCustomerPurchaseRow,
  PosCustomerQuotaRow,
  PosCustomerReturnRow,
} from "@/features/customers/types/pos-customer-detail.types";
import { PosCustomerBankAccountsSection } from "@/features/customers/ui/PosCustomerBankAccountsSection";
import {
  CREDIT_NOTE_USAGE_LABEL,
  TX_TYPE_LABEL,
  creditNoteUsageVariant,
  documentTypeLabel,
  fmtClp,
  formatCustomerDateTime,
  PAYMENT_STATUS_LABEL,
  paymentStatusVariant,
} from "@/features/customers/lib/pos-customer-detail-format";

type Props = {
  customerId: string | null;
  initialBundle: PosCustomerDetailBundle | null;
  invalidId: boolean;
  internalCreditEnabled?: boolean;
};

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="wrap-break-word text-sm text-foreground">{value || "—"}</dd>
    </div>
  );
}

function SectionCard({
  title,
  children,
  testId,
}: {
  title: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section
      className="rounded-xl border border-border bg-background p-4 shadow-sm"
      data-test-id={testId}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyTableMsg({ children }: { children: string }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function refundModeLabel(mode: string | null): string {
  if (mode === "immediate") return "Reembolso inmediato";
  if (mode === "document") return "Solo documento";
  return "—";
}

function panelShell(className: string, children: ReactNode, testId?: string) {
  return (
    <article
      className={`w-full min-w-0 rounded-xl border border-border bg-background p-4 shadow-sm ${className}`}
      data-test-id={testId}
    >
      {children}
    </article>
  );
}

export default function PosCustomerDetailPanel({
  customerId,
  initialBundle,
  invalidId,
  internalCreditEnabled = false,
}: Props) {
  const [bundle, setBundle] = useState<PosCustomerDetailBundle | null>(initialBundle);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = customerId?.trim();
    if (!id || invalidId) {
      setBundle(null);
      setLoading(false);
      return;
    }

    const initialMatches =
      initialBundle?.success === true && initialBundle.customer.customerId === id;
    if (initialMatches) {
      setBundle(initialBundle);
    } else {
      setBundle(null);
    }

    let cancelled = false;
    if (!initialMatches) setLoading(true);

    void getCustomerPosDetailBundleAction(id).then((res) => {
      if (cancelled) return;
      setBundle(res);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [customerId, invalidId, initialBundle]);

  if (invalidId) {
    return panelShell(
      "",
      <>
        <h2 className="text-sm font-semibold text-foreground">Ficha del cliente</h2>
        <Alert variant="error" className="mt-3 text-sm">
          El identificador en la URL no es válido.
        </Alert>
      </>,
      "pos-customer-detail-panel",
    );
  }

  if (!customerId?.trim()) {
    return panelShell(
      "",
      <>
        <h2 className="text-sm font-semibold text-foreground">Ficha del cliente</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Busca y elige un cliente arriba para ver su ficha completa.
        </p>
      </>,
      "pos-customer-detail-panel-empty",
    );
  }

  if (loading && (!bundle || !bundle.success)) {
    return panelShell(
      "flex items-center justify-center py-12",
      <p className="text-sm text-muted-foreground">Cargando ficha del cliente…</p>,
      "pos-customer-detail-panel-loading",
    );
  }

  if (!bundle || !bundle.success) {
    return panelShell(
      "",
      <>
        <h2 className="text-sm font-semibold text-foreground">Ficha del cliente</h2>
        <Alert variant="error" className="mt-3 text-sm">
          {bundle && !bundle.success ? bundle.message : "No se pudo cargar el cliente."}
        </Alert>
      </>,
      "pos-customer-detail-panel-error",
    );
  }

  const customer = bundle.customer;
  const { payments, quotas, purchases, returns, creditNotes } = bundle;
  const backorders = (bundle as any).backorders ?? [];

  return (
    <article className="w-full min-w-0 space-y-4" data-test-id="pos-customer-detail-panel">
      <header className="rounded-xl border border-border bg-background px-4 py-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ficha del cliente</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">{customer.displayName}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant={customer.isActive ? "success-outlined" : "secondary-outlined"}>
            {customer.isActive ? "Activo" : "Inactivo"}
          </Badge>
          {loading ? <span className="text-xs text-muted-foreground">Actualizando…</span> : null}
        </div>
      </header>

      <SectionCard title="Datos de contacto" testId="pos-customer-detail-summary">
        <SummarySection customer={customer} />
      </SectionCard>

      <PosCustomerBankAccountsSection personId={customer.personId ?? ""} />

      {internalCreditEnabled ? (
        <SectionCard title="Crédito" testId="pos-customer-detail-credit">
          <CreditSection customer={customer} />
        </SectionCard>
      ) : null}

      <SectionCard title="Cuotas pendientes" testId="pos-customer-detail-quotas">
        <QuotasSection
          rows={quotas}
          customerId={customer.customerId}
          customerDisplayName={customer.displayName}
        />
      </SectionCard>

      <SectionCard title="Compras" testId="pos-customer-detail-purchases">
        <PurchasesSection
          rows={purchases}
          customerId={customer.customerId}
          customerDisplayName={customer.displayName}
        />
      </SectionCard>

      <SectionCard title="Encargos" testId="pos-customer-detail-backorders">
        <BackordersSection rows={backorders} />
      </SectionCard>

      <SectionCard title="Pagos y cobros" testId="pos-customer-detail-payments">
        <PaymentsSection rows={payments} />
      </SectionCard>

      <SectionCard title="Devoluciones" testId="pos-customer-detail-returns">
        <ReturnsSection rows={returns} />
      </SectionCard>

      <SectionCard title="Notas de crédito" testId="pos-customer-detail-credit-notes">
        <CreditNotesSection
          rows={creditNotes}
          customerId={customer.customerId}
          customerDisplayName={customer.displayName}
        />
      </SectionCard>
    </article>
  );
}

function BackordersSection({ rows }: { rows?: PosCustomerBackorderRow[] }) {
  const safe = Array.isArray(rows) ? rows : [];
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    id: string;
    documentNumber: string | null;
    createdAt: string;
    lines: Array<{
      id: string;
      productName: string;
      variantName: string | null;
      quantity: number;
      unitOfMeasure: string | null;
    }>;
  } | null>(null);

  if (!safe.length) {
    return <EmptyTableMsg>No hay encargos registrados.</EmptyTableMsg>;
  }

  const openDetail = async (txId: string) => {
    setBusy(true);
    setError(null);
    setOpen(true);
    try {
      const res = await getBackorderDetailPosAction(txId);
      if (!res || (res as any).success !== true) {
        setDetail(null);
        setError((res as any)?.message || "No se pudo cargar el encargo");
        return;
      }
      setDetail((res as any).transaction);
    } catch (e) {
      setDetail(null);
      setError(e instanceof Error ? e.message : "No se pudo cargar el encargo");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase text-muted-foreground">
              <th className="w-10 px-3 py-2" />
              <th className="px-3 py-2">Folio</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {safe.map((r) => (
              <tr key={r.id} className="border-b border-border/80">
                <td className="px-2 py-2">
                  <IconButton
                    icon="MoreHorizontal"
                    variant="neutral"
                    size="sm"
                    ariaLabel="Ver productos del encargo"
                    title="Ver productos del encargo"
                    onClick={() => void openDetail(r.id)}
                    data-test-id={`pos-customer-backorder-detail-${r.id}`}
                  />
                </td>
                <td className="px-3 py-2 font-mono">{r.documentNumber ?? "—"}</td>
                <td className="px-3 py-2">{r.status ?? "—"}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{fmtClp(r.total)}</td>
                <td className="px-3 py-2">{formatCustomerDateTime(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={open}
        onClose={() => {
          if (busy) return;
          setOpen(false);
          setError(null);
          setDetail(null);
        }}
        title="Productos del encargo"
        size="lg"
        scroll="paper"
        alertArea={
          error ? (
            <Alert variant="error" className="text-sm">
              {error}
            </Alert>
          ) : null
        }
        actions={
          <>
            <Button variant="secondary" type="button" disabled={busy} onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </>
        }
        data-test-id="pos-backorder-detail-dialog"
      >
        {busy ? <p className="text-sm text-muted-foreground">Cargando…</p> : null}
        {!busy && detail && detail.lines.length === 0 ? (
          <EmptyTableMsg>Este encargo no tiene líneas.</EmptyTableMsg>
        ) : null}
        {!busy && detail && detail.lines.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {detail.documentNumber ? <span className="font-mono">{detail.documentNumber}</span> : "Encargo"} ·{" "}
              {formatCustomerDateTime(detail.createdAt)}
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[680px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase text-muted-foreground">
                    <th className="px-3 py-2">Producto</th>
                    <th className="px-3 py-2">Variante</th>
                    <th className="px-3 py-2 text-right">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.lines.map((l) => (
                    <tr key={l.id} className="border-b border-border/80">
                      <td className="px-3 py-2">{l.productName}</td>
                      <td className="px-3 py-2 text-muted-foreground">{l.variantName ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(l.quantity)}
                        {l.unitOfMeasure ? ` ${l.unitOfMeasure}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}

function SummarySection({ customer }: { customer: PosCustomerDetail }) {
  const docLine = [
    documentTypeLabel(customer.documentType),
    customer.documentNumber?.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-4">
      <dl className="grid gap-3 sm:grid-cols-2">
        <DetailField label="Documento" value={docLine} />
        <DetailField label="Teléfono" value={customer.phone ?? ""} />
        <DetailField label="Email" value={customer.email ?? ""} />
        <DetailField label="Dirección" value={customer.address ?? ""} />
        <DetailField label="Alta" value={formatCustomerDateTime(customer.createdAt)} />
        <DetailField label="Última actualización" value={formatCustomerDateTime(customer.updatedAt)} />
      </dl>
      {customer.notes?.trim() ? (
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Notas</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{customer.notes.trim()}</p>
        </div>
      ) : null}
    </div>
  );
}

function CreditSection({ customer }: { customer: PosCustomerDetail }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      <DetailField label="Límite de crédito" value={fmtClp(customer.creditLimit)} />
      <DetailField label="Utilizado" value={fmtClp(customer.usedCredit)} />
      <DetailField label="Disponible" value={fmtClp(customer.availableCredit)} />
      <DetailField
        label="Día de pago"
        value={
          customer.paymentDayOfMonth != null && Number.isFinite(customer.paymentDayOfMonth)
            ? String(customer.paymentDayOfMonth)
            : ""
        }
      />
    </dl>
  );
}

function PurchasesSection({
  rows,
  customerId,
  customerDisplayName,
}: {
  rows: PosCustomerPurchaseRow[];
  customerId: string;
  customerDisplayName: string;
}) {
  const router = useRouter();
  const collectible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (r.transactionType ?? "").toUpperCase() === "SALE" &&
          r.balanceDue > 0 &&
          (r.paymentStatus ?? "").toUpperCase() !== "PAID",
      ),
    [rows],
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedIds(new Set());
  }, [customerId, rows]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size >= collectible.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(collectible.map((r) => r.id)));
  }, [collectible, selectedIds.size]);

  const selectedTotal = useMemo(
    () =>
      collectible
        .filter((r) => selectedIds.has(r.id))
        .reduce((acc, r) => acc + r.balanceDue, 0),
    [collectible, selectedIds],
  );

  const handleCollect = useCallback(() => {
    const sales = collectible
      .filter((r) => selectedIds.has(r.id))
      .map((r) => ({
        id: r.id,
        documentNumber: r.documentNumber,
        balanceDue: r.balanceDue,
      }));
    if (sales.length === 0) return;
    writePosArCollectDraft({
      customerId,
      customerDisplayName,
      sales,
    });
    router.push("/pos/payment?mode=collect");
  }, [collectible, selectedIds, customerId, customerDisplayName, router]);

  if (rows.length === 0) {
    return <EmptyTableMsg>No hay ventas ni encargos registrados.</EmptyTableMsg>;
  }

  return (
    <div className="space-y-3">
      {collectible.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-muted/20 px-3 py-2">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              checked={selectedIds.size > 0 && selectedIds.size === collectible.length}
              onChange={toggleAll}
              data-test-id="pos-customer-purchases-select-all"
            />
            Seleccionar todas ({collectible.length})
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {selectedIds.size > 0
                ? `${selectedIds.size} folio(s) · ${fmtClp(selectedTotal)}`
                : "Selecciona ventas pendientes de cobro"}
            </span>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={handleCollect}
              data-test-id="pos-customer-collect-selection"
            >
              Cobrar selección
            </Button>
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase text-muted-foreground">
              {collectible.length > 0 ? <th className="w-8 px-2 py-2" /> : null}
              <th className="px-3 py-2">Folio</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Estado trans.</th>
              <th className="px-3 py-2">Estado pago</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Saldo</th>
              <th className="px-3 py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const typeKey = r.transactionType ?? "";
              const isCollectibleRow = collectible.some((c) => c.id === r.id);
              const payKey = (r.paymentStatus ?? "").toUpperCase();
              return (
                <tr key={r.id} className="border-b border-border/80">
                  {collectible.length > 0 ? (
                    <td className="px-2 py-2">
                      {isCollectibleRow ? (
                        <input
                          type="checkbox"
                          className="size-4 rounded border-border"
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleRow(r.id)}
                          data-test-id={`pos-customer-purchase-select-${r.id}`}
                        />
                      ) : null}
                    </td>
                  ) : null}
                  <td className="px-3 py-2 font-mono">{r.documentNumber ?? "—"}</td>
                  <td className="px-3 py-2">{TX_TYPE_LABEL[typeKey] ?? (typeKey || "—")}</td>
                  <td className="px-3 py-2">{r.status ?? "—"}</td>
                  <td className="px-3 py-2">
                    {r.paymentStatus ? (
                      <Badge variant={paymentStatusVariant(r.paymentStatus)}>
                        {PAYMENT_STATUS_LABEL[payKey] ?? r.paymentStatus}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtClp(r.total)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                    {r.balanceDue > 0 ? fmtClp(r.balanceDue) : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatCustomerDateTime(r.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatRelatedSalesLabel(
  relatedSales: PosCustomerPaymentRow["relatedSales"],
): string {
  if (!relatedSales.length) return "—";
  if (relatedSales.length === 1) {
    return relatedSales[0].documentNumber?.trim() || relatedSales[0].saleId;
  }
  return relatedSales
    .map((s) => s.documentNumber?.trim() || s.saleId.slice(0, 8))
    .join(", ");
}

function formatRelatedCreditNotesLabel(
  relatedCreditNotes: PosCustomerPaymentRow["relatedCreditNotes"],
): string {
  if (!relatedCreditNotes.length) return "—";
  if (relatedCreditNotes.length === 1) {
    return (
      relatedCreditNotes[0].documentNumber?.trim() ||
      relatedCreditNotes[0].creditNoteId
    );
  }
  return relatedCreditNotes
    .map((n) => n.documentNumber?.trim() || n.creditNoteId.slice(0, 8))
    .join(", ");
}

function formatPaymentReferenceLabel(row: PosCustomerPaymentRow): string {
  if (row.relatedCreditNotes.length > 0) {
    return formatRelatedCreditNotesLabel(row.relatedCreditNotes);
  }
  return formatRelatedSalesLabel(row.relatedSales);
}

function PaymentsSection({ rows }: { rows: PosCustomerPaymentRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyTableMsg>
        No hay cobros ni devoluciones de saldo NC registrados.
      </EmptyTableMsg>
    );
  }
  return (
    <DataTable
      headers={["Folio", "Referencia", "Tipo", "Medio", "Monto", "Fecha"]}
      rows={rows.map((r) => {
        const typeKey = r.type ?? "";
        return [
          r.documentNumber ?? "—",
          formatPaymentReferenceLabel(r),
          TX_TYPE_LABEL[typeKey] ?? (typeKey || "—"),
          r.paymentMethod ?? "—",
          fmtClp(r.total),
          formatCustomerDateTime(r.createdAt),
        ];
      })}
    />
  );
}

function ReturnsSection({ rows }: { rows: PosCustomerReturnRow[] }) {
  if (rows.length === 0) {
    return <EmptyTableMsg>No hay devoluciones registradas.</EmptyTableMsg>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase text-muted-foreground">
            <th className="px-3 py-2">Folio</th>
            <th className="px-3 py-2">Modo</th>
            <th className="px-3 py-2 text-right">Total</th>
            <th className="px-3 py-2">NC asociada</th>
            <th className="px-3 py-2">Estado NC</th>
            <th className="px-3 py-2">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/80">
              <td className="px-3 py-2 font-mono">{r.documentNumber}</td>
              <td className="px-3 py-2">{refundModeLabel(r.refundMode)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-medium">{fmtClp(r.total)}</td>
              <td className="px-3 py-2 font-mono">{r.linkedCreditNote?.documentNumber ?? "—"}</td>
              <td className="px-3 py-2">
                {r.linkedCreditNote ? (
                  <Badge variant={creditNoteUsageVariant(r.linkedCreditNote.usageStatus)}>
                    {CREDIT_NOTE_USAGE_LABEL[r.linkedCreditNote.usageStatus]}
                  </Badge>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {formatCustomerDateTime(r.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreditNotesSection({
  rows,
  customerId,
  customerDisplayName,
}: {
  rows: PosCustomerCreditNoteRow[];
  customerId: string;
  customerDisplayName: string;
}) {
  const router = useRouter();
  const refundable = useMemo(
    () => rows.filter((r) => Math.round(r.availableAmount) >= 1),
    [rows],
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedIds(new Set());
  }, [customerId, rows]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size >= refundable.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(refundable.map((r) => r.id)));
  }, [refundable, selectedIds.size]);

  const selectedTotal = useMemo(
    () =>
      refundable
        .filter((r) => selectedIds.has(r.id))
        .reduce((acc, r) => acc + Math.round(r.availableAmount), 0),
    [refundable, selectedIds],
  );

  const handlePayout = useCallback(() => {
    const notes = refundable
      .filter((r) => selectedIds.has(r.id))
      .map((r) => ({
        id: r.id,
        documentNumber: r.documentNumber,
        availableAmount: Math.round(r.availableAmount),
      }));
    if (notes.length === 0) return;
    writePosNcPayoutDraft({
      customerId,
      customerDisplayName,
      creditNotes: notes,
    });
    router.push("/pos/payment?mode=nc-payout");
  }, [refundable, selectedIds, customerId, customerDisplayName, router]);

  if (rows.length === 0) {
    return <EmptyTableMsg>No hay notas de crédito registradas.</EmptyTableMsg>;
  }

  return (
    <div className="space-y-3">
      {refundable.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-muted/20 px-3 py-2">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              checked={selectedIds.size > 0 && selectedIds.size === refundable.length}
              onChange={toggleAll}
              data-test-id="pos-customer-nc-select-all"
            />
            Seleccionar todas ({refundable.length})
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {selectedIds.size > 0
                ? `${selectedIds.size} NC · ${fmtClp(selectedTotal)} (100 % del disponible)`
                : "Selecciona notas con saldo a devolver en caja"}
            </span>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={handlePayout}
              data-test-id="pos-customer-nc-payout-selection"
            >
              Devolver saldo
            </Button>
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[560px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase text-muted-foreground">
              {refundable.length > 0 ? <th className="w-8 px-2 py-2" /> : null}
              <th className="px-3 py-2">Folio NC</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Utilizado</th>
              <th className="px-3 py-2 text-right">Disponible</th>
              <th className="px-3 py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isRefundableRow = refundable.some((x) => x.id === r.id);
              return (
                <tr key={r.id} className="border-b border-border/80">
                  {refundable.length > 0 ? (
                    <td className="px-2 py-2">
                      {isRefundableRow ? (
                        <input
                          type="checkbox"
                          className="size-4 rounded border-border"
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleRow(r.id)}
                          data-test-id={`pos-customer-nc-select-${r.id}`}
                        />
                      ) : null}
                    </td>
                  ) : null}
                  <td className="px-3 py-2 font-mono">{r.documentNumber}</td>
                  <td className="px-3 py-2">
                    <Badge variant={creditNoteUsageVariant(r.usageStatus)}>
                      {CREDIT_NOTE_USAGE_LABEL[r.usageStatus]}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtClp(r.total)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtClp(r.consumedAmount)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                    {fmtClp(r.availableAmount)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatCustomerDateTime(r.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuotasSection({
  rows,
  customerId,
  customerDisplayName,
}: {
  rows: PosCustomerQuotaRow[];
  customerId: string;
  customerDisplayName: string;
}) {
  const router = useRouter();
  const hasOpenCashSession = Boolean(readPosContextClient()?.cashSessionId?.trim());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedIds(new Set());
  }, [customerId, rows]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size >= rows.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(rows.map((r) => r.id)));
  }, [rows, selectedIds.size]);

  const selectedTotal = useMemo(
    () =>
      rows.filter((r) => selectedIds.has(r.id)).reduce((acc, r) => acc + r.amount, 0),
    [rows, selectedIds],
  );

  const handleCollect = useCallback(() => {
    if (!hasOpenCashSession) return;
    const quotas = rows
      .filter((r) => selectedIds.has(r.id))
      .map((r) => ({
        id: r.id,
        transactionId: r.transactionId,
        documentNumber: r.documentNumber,
        amount: r.amount,
        dueDate: r.dueDate,
      }));
    if (quotas.length === 0) return;
    writePosQuotaCollectDraft({
      customerId,
      customerDisplayName,
      quotas,
    });
    router.push("/pos/payment?mode=quota");
  }, [rows, selectedIds, customerId, customerDisplayName, router, hasOpenCashSession]);

  if (rows.length === 0) {
    return <EmptyTableMsg>Sin cuotas pendientes registradas.</EmptyTableMsg>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-muted/20 px-3 py-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
          <input
            type="checkbox"
            className="size-4 rounded border-border"
            checked={selectedIds.size > 0 && selectedIds.size === rows.length}
            onChange={toggleAll}
            data-test-id="pos-customer-quotas-select-all"
          />
          Seleccionar todas ({rows.length})
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {!hasOpenCashSession
              ? "Abre una sesión de caja para cobrar cuotas"
              : selectedIds.size > 0
                ? `${selectedIds.size} cuota(s) · ${fmtClp(selectedTotal)}`
                : "Selecciona cuotas pendientes de cobro"}
          </span>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={selectedIds.size === 0 || !hasOpenCashSession}
            onClick={handleCollect}
            data-test-id="pos-customer-collect-quotas"
          >
            Cobrar cuotas
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[560px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase text-muted-foreground">
              <th className="w-8 px-2 py-2" />
              <th className="px-3 py-2">Documento</th>
              <th className="px-3 py-2">Vencimiento</th>
              <th className="px-3 py-2 text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((q) => (
              <tr key={q.id} className="border-b border-border/80">
                <td className="px-2 py-2">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-border"
                    checked={selectedIds.has(q.id)}
                    onChange={() => toggleRow(q.id)}
                    data-test-id={`pos-customer-quota-select-${q.id}`}
                  />
                </td>
                <td className="px-3 py-2 font-mono">
                  {q.documentNumber ?? q.transactionId ?? "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {formatCustomerDateTime(q.dueDate)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">
                  {fmtClp(q.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[480px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase text-muted-foreground">
            {headers.map((h) => (
              <th
                key={h}
                className={`px-3 py-2 ${h === "Total" || h === "Monto" ? "text-right" : ""}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={`row-${i}`} className="border-b border-border/80">
              {cells.map((cell, j) => (
                <td
                  key={`cell-${i}-${j}`}
                  className={`px-3 py-2 ${j >= cells.length - 2 && (headers[j] === "Total" || headers[j] === "Monto") ? "text-right tabular-nums font-medium" : ""} ${j === 0 ? "font-mono" : ""}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
