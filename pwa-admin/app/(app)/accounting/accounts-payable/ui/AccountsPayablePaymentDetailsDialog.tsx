"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import Badge from "@kai/ui";
import type { AccountsPayableRow } from "@/features/accounting-accounts-payable/types/accounts-payable.types";
import {
  labelAccountsPayableOriginCategory,
  resolveAccountsPayableOriginCategoryFromRow,
} from "@/features/accounting-accounts-payable/lib/accounts-payable-labels";
import { getTransactionTypeLabel } from "@/features/transactions/types/transaction-types";
import { labelPayrollLineTypeId } from "@/features/hr-remunerations/types/remuneration.types";

type Tx = Record<string, unknown>;

type Props = {
  open: boolean;
  row: AccountsPayableRow | null;
  onClose: () => void;
};

function fmtClp(n: unknown): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(v));
}

function safeStr(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s || "—";
}

function getObj(o: Tx, key: string): Tx | null {
  const v = o[key];
  return v && typeof v === "object" ? (v as Tx) : null;
}

function getArr(o: Tx, key: string): unknown[] {
  const v = o[key];
  return Array.isArray(v) ? v : [];
}

function sectionTitle(title: string) {
  return <h4 className="text-sm font-semibold">{title}</h4>;
}

export default function AccountsPayablePaymentDetailsDialog({ open, row, onClose }: Props) {
  const [paymentTx, setPaymentTx] = useState<Tx | null>(null);
  const [parentTx, setParentTx] = useState<Tx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !row?.id) {
      setPaymentTx(null);
      setParentTx(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setPaymentTx(null);
    setParentTx(null);

    void (async () => {
      try {
        const paymentRes = await fetch(`/api/transactions/${encodeURIComponent(row.id)}`, {
          method: "GET",
          cache: "no-store",
        });
        const payment = (await paymentRes.json().catch(() => null)) as Tx | null;
        if (!paymentRes.ok || !payment || typeof payment !== "object") {
          const msg =
            payment && typeof payment === "object" && "message" in payment
              ? String((payment as { message: unknown }).message)
              : `HTTP ${paymentRes.status}`;
          throw new Error(msg || "No se pudo cargar el detalle del pago.");
        }
        setPaymentTx(payment);

        const paymentData = getObj(payment, "data");
        const parentId = (paymentData?.relatedTransactionId as string | undefined) || row.parentTransactionId || null;
        if (parentId) {
          const parentRes = await fetch(`/api/transactions/${encodeURIComponent(parentId)}`, {
            method: "GET",
            cache: "no-store",
          });
          const parent = (await parentRes.json().catch(() => null)) as Tx | null;
          if (!parentRes.ok || !parent || typeof parent !== "object") {
            const msg =
              parent && typeof parent === "object" && "message" in parent
                ? String((parent as { message: unknown }).message)
                : `HTTP ${parentRes.status}`;
            throw new Error(msg || "No se pudo cargar el documento padre.");
          }
          setParentTx(parent);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo cargar el detalle del pago.");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, row?.id, row?.parentTransactionId]);

  const payment = useMemo(() => getObj(paymentTx ?? {}, "data"), [paymentTx]);
  const parent = useMemo(() => getObj(parentTx ?? {}, "data"), [parentTx]);

  const parentType = safeStr(parent?.transactionType || row?.parentType);
  const originCategory = labelAccountsPayableOriginCategory(
    resolveAccountsPayableOriginCategoryFromRow(row ?? {}),
  );

  const parentLines = getArr(parent ?? {}, "lines");
  const payrollMeta = getObj(parent ?? {}, "metadata");
  const payrollLines = Array.isArray(payrollMeta?.lines) ? (payrollMeta?.lines as unknown[]) : [];

  const linkedDoc = getObj(payrollMeta ?? {}, "linkedTributaryDocument");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Detalle del pago"
      size="lg"
      scroll="paper"
      data-test-id="accounts-payable-payment-details-dialog"
      alertArea={error ? <Alert variant="error">{error}</Alert> : null}
      actions={null}
      hideActions
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info-outlined">{originCategory}</Badge>
            {parentType !== "—" ? (
              <Badge variant="secondary-outlined">{getTransactionTypeLabel(parentType)}</Badge>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              {sectionTitle("Pago (cuota)")}
              <p className="text-sm">
                <span className="text-muted-foreground">Folio: </span>
                {safeStr(payment?.documentNumber || row?.documentNumber)}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Vence: </span>
                {safeStr(payment?.paymentDueDate || row?.dueDate)}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Monto: </span>
                <strong>{fmtClp(payment?.total ?? row?.amount)}</strong>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Pendiente: </span>
                <strong>{fmtClp((row?.pendingAmount ?? 0) || (payment?.total ?? 0))}</strong>
              </p>
            </div>

            <div className="space-y-1">
              {sectionTitle("Documento padre")}
              <p className="text-sm">
                <span className="text-muted-foreground">Folio: </span>
                {safeStr(parent?.documentNumber || row?.parentDocumentNumber)}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Beneficiario: </span>
                {safeStr(row?.payeeName)}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Total: </span>
                <strong>{fmtClp(parent?.total)}</strong>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Pagado: </span>
                <strong>{fmtClp(parent?.amountPaid)}</strong>
              </p>
            </div>
          </div>

          {parentType === "SUPPLIER_INVOICE" || parentType === "SUPPLIER_RECEIPT" ? (
            <div className="space-y-2">
              {sectionTitle("Productos / líneas de la factura")}
              {parentLines.length ? (
                <div className="overflow-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Detalle</th>
                        <th className="px-3 py-2 text-right font-medium">Cant.</th>
                        <th className="px-3 py-2 text-right font-medium">Precio</th>
                        <th className="px-3 py-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parentLines.map((l, idx) => {
                        const line = l && typeof l === "object" ? (l as Tx) : {};
                        return (
                          <tr key={String(line.id ?? idx)} className="border-t border-border">
                            <td className="px-3 py-2">{safeStr(line.productName || line.name)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{safeStr(line.quantity)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{fmtClp(line.unitPrice)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{fmtClp(line.total ?? line.subtotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Este documento no tiene líneas disponibles.</p>
              )}
            </div>
          ) : null}

          {parentType === "PAYROLL" ? (
            <div className="space-y-2">
              {sectionTitle("Detalle nómina")}
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <p className="text-sm">
                  <span className="text-muted-foreground">Haberes: </span>
                  <strong>{fmtClp(payrollMeta?.totalEarnings)}</strong>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Descuentos: </span>
                  <strong>{fmtClp(payrollMeta?.totalDeductions)}</strong>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Líquido: </span>
                  <strong>{fmtClp(payrollMeta?.netPayment)}</strong>
                </p>
              </div>
              {payrollLines.length ? (
                <div className="overflow-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Tipo</th>
                        <th className="px-3 py-2 text-right font-medium">Monto</th>
                        <th className="px-3 py-2 text-left font-medium">Categoría</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollLines.map((l, idx) => {
                        const line = l && typeof l === "object" ? (l as Tx) : {};
                        return (
                          <tr key={String(line.typeId ?? idx)} className="border-t border-border">
                            <td className="px-3 py-2">{labelPayrollLineTypeId(safeStr(line.typeId))}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{fmtClp(line.amount)}</td>
                            <td className="px-3 py-2">{safeStr(line.category)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin líneas de nómina en metadata.</p>
              )}
            </div>
          ) : null}

          {parentType === "OPERATING_EXPENSE" ? (
            <div className="space-y-2">
              {sectionTitle("Detalle gasto operativo")}
              <p className="text-sm">
                <span className="text-muted-foreground">Referencia: </span>
                {safeStr(parent?.externalReference)}
              </p>
              <p className="text-sm text-muted-foreground">
                Si el gasto está vinculado a un documento tributario, se mostrará en metadata.
              </p>
              <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs">
                {JSON.stringify(parent?.metadata ?? {}, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}

