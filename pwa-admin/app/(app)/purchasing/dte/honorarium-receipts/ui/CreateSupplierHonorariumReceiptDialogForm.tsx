"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@kai/ui";
import { AutoComplete } from "@kai/ui";
import type { Option } from "@kai/ui";
import { Button } from "@kai/ui";
import type { CreateSupplierHonorariumReceiptInput } from "@/features/purchasing-supplier-honorarium-receipts/types/supplier-honorarium-receipt.types";
import { createSupplierHonorariumReceiptAction } from "@/features/purchasing-supplier-honorarium-receipts/actions/supplier-honorarium-receipt.action";
import { usePurchaseDocumentReferenceData } from "@/shared/components/PurchaseDocumentBuilder/usePurchaseDocumentReferenceData";
import type { SupplierGridRow } from "@/features/purchasing-suppliers/types/supplier.types";
import { supplierOptionLabel } from "@/features/purchasing-dte/lib/supplier-option-label";
import { pickHonorariumRetentionTaxForLines } from "@/features/purchasing-dte/lib/iva-from-taxes";
import {
  amountsHonorariumWhenNetEdited,
  amountsHonorariumWhenTotalEdited,
} from "@/features/purchasing-dte/lib/honorarium-amounts";

export type CreateSupplierHonorariumReceiptDialogFormProps = {
  onClose?: () => void;
};

export function CreateSupplierHonorariumReceiptDialogForm({
  onClose,
}: CreateSupplierHonorariumReceiptDialogFormProps) {
  const router = useRouter();
  const reference = usePurchaseDocumentReferenceData();
  const suppliers = reference.status === "ready" ? reference.suppliers : [];
  const taxes = reference.status === "ready" ? reference.taxes : [];
  const branchId = reference.status === "ready" ? reference.branchId : "";
  const referenceError = reference.status === "error" ? reference.message : null;
  const referenceLoading = reference.status === "loading";

  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.isActive !== false), [suppliers]);
  const retention = useMemo(() => pickHonorariumRetentionTaxForLines(taxes), [taxes]);
  const retentionRate = retention.rate;

  const supplierOptions: Option[] = useMemo(
    () => activeSuppliers.map((s: SupplierGridRow) => ({ id: s.id, label: supplierOptionLabel(s) })),
    [activeSuppliers],
  );

  const [supplierOpt, setSupplierOpt] = useState<Option | null>(null);
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
      const p = amountsHonorariumWhenNetEdited(n, retentionRate);
      setNetStr(String(p.net));
      setTotalStr(String(p.total));
      lastAmountField.current = "net";
    },
    [retentionRate],
  );

  const onTotalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const g = Math.max(0, Math.round(Number(e.target.value) || 0));
      const p = amountsHonorariumWhenTotalEdited(g, retentionRate);
      setNetStr(String(p.net));
      setTotalStr(String(p.total));
      lastAmountField.current = "total";
    },
    [retentionRate],
  );

  useEffect(() => {
    if (lastAmountField.current === "net") {
      const n = Math.max(0, Math.round(Number(netStr) || 0));
      const p = amountsHonorariumWhenNetEdited(n, retentionRate);
      setNetStr(String(p.net));
      setTotalStr(String(p.total));
    } else {
      const g = Math.max(0, Math.round(Number(totalStr) || 0));
      const p = amountsHonorariumWhenTotalEdited(g, retentionRate);
      setNetStr(String(p.net));
      setTotalStr(String(p.total));
    }
  }, [retentionRate]);

  const net = Math.max(0, Math.round(Number(netStr) || 0));
  const total = Math.max(0, Math.round(Number(totalStr) || 0));
  const taxAmount = total - net;

  const canSubmit = useMemo(() => {
    const sid = supplierOpt?.id && String(supplierOpt.id).trim();
    return Boolean(sid && branchId && net > 0 && total > 0 && !busy && !referenceLoading);
  }, [supplierOpt, branchId, net, total, busy, referenceLoading]);

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
    if (net <= 0 || total <= 0) {
      setError("Indique montos válidos.");
      return;
    }
    setBusy(true);
    try {
      const input: CreateSupplierHonorariumReceiptInput = {
        branchId,
        supplierId,
        dteNumber: dteNumber.trim() || null,
        notes: notes.trim() || null,
        subtotal: net,
        taxAmount,
        discountAmount: 0,
        total,
        paymentStatus: "PENDING",
        amountPaid: 0,
        lines: [
          {
            quantity: 1,
            unitPrice: net,
            productName: "Boleta honorarios proveedor (resumen)",
            subtotal: net,
            taxRate: retentionRate,
            taxAmount,
            total,
            ...(retention.taxId ? { taxId: retention.taxId } : {}),
          },
        ],
        links: {},
      };

      await createSupplierHonorariumReceiptAction(input);
      onClose?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear la boleta de honorarios");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3" data-test-id="create-supplier-honorarium-receipt-dialog-form">
      {referenceError ? (
        <p className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error" role="alert">
          {referenceError}
        </p>
      ) : null}
      <AutoComplete
        label="Proveedor"
        name="dte-honorarium-supplier"
        placeholder={referenceLoading ? "Cargando…" : "Buscar o seleccionar…"}
        options={supplierOptions}
        value={supplierOpt}
        onChange={(opt) => setSupplierOpt(opt)}
        alwaysShowLabel
        disabled={referenceLoading || Boolean(referenceError)}
        data-test-id="dte-honorarium-supplier"
      />
      <TextField label="Folio DTE" value={dteNumber} onChange={(e) => setDteNumber(e.target.value)} />
      <TextField label="Notas" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <TextField label="Monto neto" type="currency" currencySymbol="$" startSymbol="$" value={netStr} onChange={onNetChange} />
      <TextField
        label="Total (bruto)"
        type="currency"
        currencySymbol="$"
        startSymbol="$"
        value={totalStr}
        onChange={onTotalChange}
      />
      <p className="text-xs text-muted-foreground">
        Retención honorarios: {retentionRate}% (catálogo de impuestos; líquido = total × (1 − tasa/100)).
      </p>
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
