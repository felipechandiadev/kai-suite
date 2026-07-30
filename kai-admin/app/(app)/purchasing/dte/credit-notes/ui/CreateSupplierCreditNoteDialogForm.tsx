"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@kai/ui";
import { AutoComplete } from "@kai/ui";
import type { Option } from "@kai/ui";
import { Button } from "@kai/ui";
import type { CreateSupplierCreditNoteInput } from "@/features/purchasing-supplier-credit-notes/types/supplier-credit-note.types";
import { createSupplierCreditNoteAction } from "@/features/purchasing-supplier-credit-notes/actions/supplier-credit-note.action";
import { usePurchaseDocumentReferenceData } from "@/shared/components/PurchaseDocumentBuilder/usePurchaseDocumentReferenceData";
import type { SupplierGridRow } from "@/features/purchasing-suppliers/types/supplier.types";
import { supplierOptionLabel } from "@/features/purchasing-dte/lib/supplier-option-label";
import { pickIvaTaxForLines } from "@/features/purchasing-dte/lib/iva-from-taxes";
import { amountsWhenNetEdited, amountsWhenTotalEdited } from "@/features/purchasing-dte/lib/clp-net-total";

export type CreateSupplierCreditNoteDialogFormProps = {
  onClose?: () => void;
};

export function CreateSupplierCreditNoteDialogForm({ onClose }: CreateSupplierCreditNoteDialogFormProps) {
  const router = useRouter();
  const reference = usePurchaseDocumentReferenceData();
  const suppliers = reference.status === "ready" ? reference.suppliers : [];
  const taxes = reference.status === "ready" ? reference.taxes : [];
  const branchId = reference.status === "ready" ? reference.branchId : "";
  const referenceError = reference.status === "error" ? reference.message : null;
  const referenceLoading = reference.status === "loading";

  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.isActive !== false), [suppliers]);
  const iva = useMemo(() => pickIvaTaxForLines(taxes), [taxes]);
  const ivaRate = iva.rate;

  const supplierOptions: Option[] = useMemo(
    () => activeSuppliers.map((s: SupplierGridRow) => ({ id: s.id, label: supplierOptionLabel(s) })),
    [activeSuppliers],
  );

  const [supplierOpt, setSupplierOpt] = useState<Option | null>(null);
  const [purchaseReturnId, setPurchaseReturnId] = useState("");
  const [supplierInvoiceId, setSupplierInvoiceId] = useState("");
  const [dteNumber, setDteNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [netStr, setNetStr] = useState("0");
  const [totalStr, setTotalStr] = useState("0");
  const lastAmountField = useRef<"net" | "total">("net");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onNetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const n = Math.max(0, Math.round(Number(e.target.value) || 0));
      const p = amountsWhenNetEdited(n, ivaRate);
      setNetStr(String(p.net));
      setTotalStr(String(p.total));
      lastAmountField.current = "net";
    },
    [ivaRate],
  );

  const onTotalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const g = Math.max(0, Math.round(Number(e.target.value) || 0));
      const p = amountsWhenTotalEdited(g, ivaRate);
      setNetStr(String(p.net));
      setTotalStr(String(p.total));
      lastAmountField.current = "total";
    },
    [ivaRate],
  );

  useEffect(() => {
    if (lastAmountField.current === "net") {
      const n = Math.max(0, Math.round(Number(netStr) || 0));
      const p = amountsWhenNetEdited(n, ivaRate);
      setNetStr(String(p.net));
      setTotalStr(String(p.total));
    } else {
      const g = Math.max(0, Math.round(Number(totalStr) || 0));
      const p = amountsWhenTotalEdited(g, ivaRate);
      setNetStr(String(p.net));
      setTotalStr(String(p.total));
    }
  }, [ivaRate]);

  const net = Math.max(0, Math.round(Number(netStr) || 0));
  const total = Math.max(0, Math.round(Number(totalStr) || 0));
  const taxAmount = total - net;

  const canSubmit = useMemo(() => {
    const sid = supplierOpt?.id && String(supplierOpt.id).trim();
    const pr = purchaseReturnId.trim();
    return Boolean(sid && branchId && pr && net > 0 && total > 0 && !busy && !referenceLoading);
  }, [supplierOpt, branchId, purchaseReturnId, net, total, busy, referenceLoading]);

  async function onSubmit() {
    setError(null);
    if (!branchId) {
      setError("No hay sucursal configurada.");
      return;
    }
    const supplierId = supplierOpt?.id != null ? String(supplierOpt.id).trim() : "";
    if (!supplierId) {
      setError("Seleccione un proveedor.");
      return;
    }
    const prId = purchaseReturnId.trim();
    if (!prId) {
      setError("Indique el UUID de la devolución (PURCHASE_RETURN).");
      return;
    }
    if (net <= 0 || total <= 0) {
      setError("Indique montos válidos.");
      return;
    }
    setBusy(true);
    try {
      const input: CreateSupplierCreditNoteInput = {
        branchId,
        supplierId,
        purchaseReturnId: prId,
        supplierInvoiceId: supplierInvoiceId.trim() || null,
        dteNumber: dteNumber.trim() || null,
        subtotal: net,
        taxAmount,
        discountAmount: 0,
        total,
        notes: notes.trim() || null,
        lines: [
          {
            quantity: 1,
            unitPrice: net,
            productName: "Nota de crédito proveedor (resumen)",
            subtotal: net,
            total,
            taxAmount,
            taxRate: ivaRate,
            ...(iva.taxId ? { taxId: iva.taxId } : {}),
          },
        ],
      };

      const res = await createSupplierCreditNoteAction(input);
      if (!res.success) {
        setError(res.error);
        return;
      }
      onClose?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3" data-test-id="create-supplier-credit-note-dialog-form">
      {referenceError ? (
        <p className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error" role="alert">
          {referenceError}
        </p>
      ) : null}
      <AutoComplete
        label="Proveedor"
        name="dte-cn-supplier"
        placeholder={referenceLoading ? "Cargando…" : "Buscar o seleccionar…"}
        options={supplierOptions}
        value={supplierOpt}
        onChange={(opt) => setSupplierOpt(opt)}
        alwaysShowLabel
        disabled={referenceLoading || Boolean(referenceError)}
        data-test-id="dte-cn-supplier"
      />
      <TextField
        label="Devolución (UUID PURCHASE_RETURN)"
        value={purchaseReturnId}
        onChange={(e) => setPurchaseReturnId(e.target.value)}
      />
      <TextField
        label="Factura proveedor relacionada (UUID, opcional)"
        value={supplierInvoiceId}
        onChange={(e) => setSupplierInvoiceId(e.target.value)}
      />
      <TextField label="Folio DTE" value={dteNumber} onChange={(e) => setDteNumber(e.target.value)} />
      <TextField label="Notas" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <TextField label="Monto neto" type="currency" currencySymbol="$" startSymbol="$" value={netStr} onChange={onNetChange} />
      <TextField
        label="Monto con impuestos"
        type="currency"
        currencySymbol="$"
        startSymbol="$"
        value={totalStr}
        onChange={onTotalChange}
      />
      <p className="text-xs text-muted-foreground">IVA aplicado: {ivaRate}% (impuesto &quot;IVA&quot; en catálogo).</p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="mt-2 flex justify-between gap-2">
        <Button variant="secondary" type="button" onClick={() => onClose?.()}>
          Cancelar
        </Button>
        <Button variant="primary" type="button" disabled={!canSubmit} loading={busy} onClick={onSubmit}>
          Crear
        </Button>
      </div>
    </div>
  );
}
