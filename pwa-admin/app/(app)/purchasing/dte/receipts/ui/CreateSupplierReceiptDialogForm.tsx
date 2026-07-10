"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@kai/ui";
import { AutoComplete } from "@kai/ui";
import type { Option } from "@kai/ui";
import { Button } from "@kai/ui";
import type { CreateSupplierReceiptInput } from "@/features/purchasing-supplier-receipts/types/supplier-receipt.types";
import { createSupplierReceiptAction } from "@/features/purchasing-supplier-receipts/actions/supplier-receipt.action";
import { usePurchaseDocumentReferenceData } from "@/shared/components/PurchaseDocumentBuilder/usePurchaseDocumentReferenceData";
import type { SupplierGridRow } from "@/features/purchasing-suppliers/types/supplier.types";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import type { CompanyBankAccountItem } from "@/features/settings-branches/infrastructure/company.request";
import type { ReceptionSupplierDocumentPaymentPayload } from "@/features/receptions/types/reception-document-payment.types";
import { supplierOptionLabel } from "@/features/purchasing-dte/lib/supplier-option-label";
import { pickIvaTaxForLines } from "@/features/purchasing-dte/lib/iva-from-taxes";
import { amountsWhenNetEdited, amountsWhenTotalEdited } from "@/features/purchasing-dte/lib/clp-net-total";
import { toYyyyMmDdLocal } from "@/features/purchasing-dte/lib/planned-payment-helpers";
import { SupplierDocumentPaymentPlanSection } from "@/shared/components/PlannedPaymentLines";

export type CreateSupplierReceiptDialogFormProps = {
  onClose?: () => void;
};

const EMPTY_SUPPLIERS: SupplierGridRow[] = [];
const EMPTY_TAXES: TaxListItem[] = [];
const EMPTY_COMPANY_BANKS: CompanyBankAccountItem[] = [];

export function CreateSupplierReceiptDialogForm({ onClose }: CreateSupplierReceiptDialogFormProps) {
  const router = useRouter();
  const reference = usePurchaseDocumentReferenceData();
  const suppliers = reference.status === "ready" ? reference.suppliers : EMPTY_SUPPLIERS;
  const taxes = reference.status === "ready" ? reference.taxes : EMPTY_TAXES;
  const branchId = reference.status === "ready" ? reference.branchId : "";
  const companyBankAccounts =
    reference.status === "ready" ? reference.companyBankAccounts : EMPTY_COMPANY_BANKS;
  const cashHubs = reference.status === "ready" ? reference.cashHubs : [];
  const referenceError = reference.status === "error" ? reference.message : null;
  const referenceLoading = reference.status === "loading";

  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.isActive !== false), [suppliers]);
  const iva = useMemo(() => pickIvaTaxForLines(taxes), [taxes]);

  const supplierOptions: Option[] = useMemo(
    () => activeSuppliers.map((s: SupplierGridRow) => ({ id: s.id, label: supplierOptionLabel(s) })),
    [activeSuppliers],
  );

  const cashHubOptions: Option[] = useMemo(
    () => cashHubs.map((h) => ({ id: h.id, label: h.name?.trim() || h.id })),
    [cashHubs],
  );

  const [supplierOpt, setSupplierOpt] = useState<Option | null>(null);
  const [dteNumber, setDteNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [netStr, setNetStr] = useState("0");
  const [totalStr, setTotalStr] = useState("0");
  const lastAmountField = useRef<"net" | "total">("net");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [paymentPayload, setPaymentPayload] = useState<ReceptionSupplierDocumentPaymentPayload>({
    mode: "PENDING",
    paidLines: [],
    scheduledLines: [],
  });
  const [paymentValid, setPaymentValid] = useState(true);

  const docDate = useMemo(() => toYyyyMmDdLocal(new Date()), []);

  const onPaymentStateChange = useCallback(
    (state: {
      payload: ReceptionSupplierDocumentPaymentPayload;
      valid: boolean;
    }) => {
      setPaymentPayload(state.payload);
      setPaymentValid(state.valid);
    },
    [],
  );

  const ivaRate = iva.rate;

  const selectedSupplier = useMemo(() => {
    const sid = supplierOpt?.id != null ? String(supplierOpt.id) : "";
    if (!sid) {
      return null;
    }
    return activeSuppliers.find((s) => s.id === sid) ?? null;
  }, [supplierOpt?.id, activeSuppliers]);

  const onNetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const raw = e.target.value;
      const n = Math.max(0, Math.round(Number(raw) || 0));
      const p = amountsWhenNetEdited(n, ivaRate);
      setNetStr(String(p.net));
      setTotalStr(String(p.total));
      lastAmountField.current = "net";
    },
    [ivaRate],
  );

  const onTotalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const raw = e.target.value;
      const g = Math.max(0, Math.round(Number(raw) || 0));
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
  const dteFolio = dteNumber.trim();

  const canSubmit = useMemo(() => {
    const sid = supplierOpt?.id && String(supplierOpt.id).trim();
    return Boolean(
      sid &&
        branchId &&
        dteFolio.length > 0 &&
        net > 0 &&
        total > 0 &&
        !busy &&
        !referenceLoading &&
        paymentValid,
    );
  }, [supplierOpt, branchId, dteFolio, net, total, busy, referenceLoading, paymentValid]);

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
    if (!dteFolio) {
      setError("Indique el folio DTE.");
      return;
    }
    if (net <= 0 || total <= 0) {
      setError("Indique montos válidos.");
      return;
    }
    if (!paymentValid) {
      setError("Revise el pago del documento.");
      return;
    }

    setBusy(true);
    try {
      const input: CreateSupplierReceiptInput = {
        branchId,
        supplierId,
        dteNumber: dteFolio,
        notes: notes.trim() || null,
        subtotal: net,
        taxAmount,
        discountAmount: 0,
        total,
        lines: [
          {
            quantity: 1,
            unitPrice: net,
            productName: "Boleta proveedor (resumen)",
            subtotal: net,
            taxRate: ivaRate,
            taxAmount,
            total,
            ...(iva.taxId ? { taxId: iva.taxId } : {}),
          },
        ],
        links: {},
        supplierDocumentPayment: paymentPayload,
      };

      await createSupplierReceiptAction(input);
      onClose?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear la boleta");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3" data-test-id="create-supplier-receipt-dialog-form">
      {referenceError ? (
        <p className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error" role="alert">
          {referenceError}
        </p>
      ) : null}
      <AutoComplete
        label="Proveedor"
        name="dte-receipt-supplier"
        placeholder={referenceLoading ? "Cargando…" : "Buscar o seleccionar…"}
        options={supplierOptions}
        value={supplierOpt}
        onChange={(opt) => setSupplierOpt(opt)}
        alwaysShowLabel
        disabled={referenceLoading || Boolean(referenceError)}
        data-test-id="dte-receipt-supplier"
      />
      <TextField
        label="Folio DTE"
        required
        value={dteNumber}
        onChange={(e) => setDteNumber(e.target.value)}
        data-test-id="dte-receipt-folio"
      />
      <TextField label="Notas" type="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Monto neto"
          type="currency"
          currencySymbol="$"
          startSymbol="$"
          value={netStr}
          onChange={onNetChange}
          data-test-id="dte-receipt-net"
        />
        <TextField
          label="Total con impuestos"
          type="currency"
          currencySymbol="$"
          startSymbol="$"
          value={totalStr}
          onChange={onTotalChange}
          data-test-id="dte-receipt-total"
        />
      </div>

      <SupplierDocumentPaymentPlanSection
        disabled={referenceLoading || Boolean(referenceError)}
        documentTotal={total}
        docDate={docDate}
        supplier={selectedSupplier}
        companyBankAccounts={companyBankAccounts}
        cashHubOptions={cashHubOptions}
        onStateChange={onPaymentStateChange}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="mt-2 flex justify-between gap-2">
        <Button variant="secondary" type="button" onClick={() => onClose?.()}>
          Cancelar
        </Button>
        <Button variant="primary" type="button" disabled={!canSubmit} loading={busy} onClick={onSubmit}>
          Guardar
        </Button>
      </div>
    </div>
  );
}
