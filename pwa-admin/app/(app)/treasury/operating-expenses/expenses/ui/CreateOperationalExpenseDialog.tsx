"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { SelectDefault as Select } from "@kai/ui";
import type { Option } from "@kai/ui";
import { AutoComplete } from "@kai/ui";
import type { Option as AutoOption } from "@kai/ui";
import { Switch } from "@kai/ui";
import { createOperationalExpenseAction } from "@/features/treasury-expenses/actions/operational-expense.action";
import type {
  ExpenseCategoryOption,
  OperationalExpenseDocumentKind,
} from "@/features/treasury-expenses/types/operational-expense.types";
import { usePurchaseDocumentReferenceData } from "@/shared/components/PurchaseDocumentBuilder/usePurchaseDocumentReferenceData";
import type { SupplierGridRow } from "@/features/purchasing-suppliers/types/supplier.types";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import type { CompanyBankAccountItem } from "@/features/settings-branches/infrastructure/company.request";
import { supplierOptionLabel } from "@/features/purchasing-dte/lib/supplier-option-label";
import { pickIvaTaxForLines, pickHonorariumRetentionTaxForLines } from "@/features/purchasing-dte/lib/iva-from-taxes";
import { amountsWhenNetEdited, amountsWhenTotalEdited } from "@/features/purchasing-dte/lib/clp-net-total";
import {
  amountsHonorariumWhenNetEdited,
  amountsHonorariumWhenTotalEdited,
} from "@/features/purchasing-dte/lib/honorarium-amounts";
import { PlannedPaymentPlanSection } from "@/shared/components/PlannedPaymentLines";
import type { PlannedPaymentPayload } from "@/shared/lib/planned-payment-plan";

export type CreateOperationalExpenseInitialValues = {
  name?: string;
  categoryId?: string;
  supplierId?: string;
  documentKind?: OperationalExpenseDocumentKind;
  description?: string | null;
  taxId?: string | null;
};

type CreateOperationalExpenseDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  categoryOptions: ExpenseCategoryOption[];
  /** Prefill from a plantilla (amounts, folio, payment, date stay empty/today). */
  initialValues?: CreateOperationalExpenseInitialValues | null;
  /** When opening from a plantilla, hide "Guardar como plantilla". */
  hideSaveAsTemplate?: boolean;
};

function isoDateToday(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_SUPPLIERS: SupplierGridRow[] = [];
const EMPTY_TAXES: TaxListItem[] = [];
const EMPTY_COMPANY_BANKS: CompanyBankAccountItem[] = [];

const DOCUMENT_KIND_OPTIONS: Option[] = [
  { id: "SUPPLIER_INVOICE", label: "Factura" },
  { id: "SUPPLIER_RECEIPT", label: "Boleta" },
  { id: "SUPPLIER_HONORARIUM_RECEIPT", label: "Boleta honorarios" },
  { id: "OTHER", label: "Otro" },
];

export function CreateOperationalExpenseDialog({
  open,
  onClose,
  onSuccess,
  categoryOptions,
  initialValues = null,
  hideSaveAsTemplate = false,
}: CreateOperationalExpenseDialogProps) {
  const reference = usePurchaseDocumentReferenceData(open);
  const suppliers = reference.status === "ready" ? reference.suppliers : EMPTY_SUPPLIERS;
  const taxes = reference.status === "ready" ? reference.taxes : EMPTY_TAXES;
  const companyBankAccounts =
    reference.status === "ready" ? reference.companyBankAccounts : EMPTY_COMPANY_BANKS;
  const cashHubs = reference.status === "ready" ? reference.cashHubs : [];
  const referenceError = reference.status === "error" ? reference.message : null;
  const referenceLoading = open && reference.status === "loading";

  const [name, setName] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [documentKind, setDocumentKind] = useState<OperationalExpenseDocumentKind>("SUPPLIER_INVOICE");
  const [supplierOpt, setSupplierOpt] = useState<AutoOption | null>(null);
  const [operationDate, setOperationDate] = useState(isoDateToday());
  const [description, setDescription] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [netStr, setNetStr] = useState("0");
  const [totalStr, setTotalStr] = useState("0");
  const lastAmountField = useRef<"net" | "total">("net");

  const [paymentPayload, setPaymentPayload] = useState<PlannedPaymentPayload>({
    mode: "PENDING",
    paidLines: [],
    scheduledLines: [],
  });
  const [paymentValid, setPaymentValid] = useState(true);
  const [paymentPlanError, setPaymentPlanError] = useState<string | null>(null);

  const selectOptions: Option[] = useMemo(
    () => categoryOptions.map((c) => ({ id: c.id, label: c.name })),
    [categoryOptions],
  );

  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.isActive !== false), [suppliers]);
  const iva = useMemo(() => pickIvaTaxForLines(taxes), [taxes]);
  const retention = useMemo(() => pickHonorariumRetentionTaxForLines(taxes), [taxes]);
  const usesHonorarium = documentKind === "SUPPLIER_HONORARIUM_RECEIPT";
  const rateForAmounts = usesHonorarium ? retention.rate : iva.rate;

  const supplierOptions: AutoOption[] = useMemo(
    () => activeSuppliers.map((s: SupplierGridRow) => ({ id: s.id, label: supplierOptionLabel(s) })),
    [activeSuppliers],
  );

  const selectedSupplier = useMemo(() => {
    const sid = supplierOpt?.id != null ? String(supplierOpt.id) : "";
    if (!sid) {
      return null;
    }
    return activeSuppliers.find((s) => s.id === sid) ?? null;
  }, [supplierOpt?.id, activeSuppliers]);

  const payeeBankAccounts = useMemo(() => {
    const raw = selectedSupplier?.person?.bankAccounts;
    return raw != null && raw.length > 0 ? raw : [];
  }, [selectedSupplier?.person?.bankAccounts]);

  const cashHubOptions: Option[] = useMemo(
    () => cashHubs.map((h) => ({ id: h.id, label: h.name?.trim() || h.id })),
    [cashHubs],
  );

  const paymentSchedule = useMemo(
    () => ({ kind: "monthly-chain" as const, anchorDate: operationDate }),
    [operationDate],
  );

  const onPaymentStateChange = useCallback(
    (state: { payload: PlannedPaymentPayload; valid: boolean; error: string | null }) => {
      setPaymentPayload(state.payload);
      setPaymentValid(state.valid);
      setPaymentPlanError(state.error);
    },
    [],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    const init = initialValues ?? null;
    setName(init?.name?.trim() ?? "");
    setReferenceNumber("");
    setCategoryId(init?.categoryId ?? categoryOptions[0]?.id ?? null);
    setDocumentKind(init?.documentKind ?? "SUPPLIER_INVOICE");
    setSupplierOpt(null);
    setOperationDate(isoDateToday());
    setDescription(init?.description?.trim() ?? "");
    setSaveAsTemplate(false);
    setError(null);
    setNetStr("0");
    setTotalStr("0");
    lastAmountField.current = "net";
    setPaymentPayload({ mode: "PENDING", paidLines: [], scheduledLines: [] });
    setPaymentValid(true);
    setPaymentPlanError(null);
  }, [open, categoryOptions, initialValues]);

  useEffect(() => {
    if (!open || !initialValues?.supplierId || reference.status !== "ready") {
      return;
    }
    const sid = initialValues.supplierId;
    const s = activeSuppliers.find((row) => row.id === sid);
    if (!s) {
      return;
    }
    setSupplierOpt({ id: s.id, label: supplierOptionLabel(s) });
  }, [open, initialValues?.supplierId, reference.status, activeSuppliers]);

  const onNetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const raw = e.target.value;
      const n = Math.max(0, Math.round(Number(raw) || 0));
      if (usesHonorarium) {
        const p = amountsHonorariumWhenNetEdited(n, rateForAmounts);
        setNetStr(String(p.net));
        setTotalStr(String(p.total));
      } else {
        const p = amountsWhenNetEdited(n, rateForAmounts);
        setNetStr(String(p.net));
        setTotalStr(String(p.total));
      }
      lastAmountField.current = "net";
    },
    [usesHonorarium, rateForAmounts],
  );

  const onTotalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const raw = e.target.value;
      const g = Math.max(0, Math.round(Number(raw) || 0));
      if (usesHonorarium) {
        const p = amountsHonorariumWhenTotalEdited(g, rateForAmounts);
        setNetStr(String(p.net));
        setTotalStr(String(p.total));
      } else {
        const p = amountsWhenTotalEdited(g, rateForAmounts);
        setNetStr(String(p.net));
        setTotalStr(String(p.total));
      }
      lastAmountField.current = "total";
    },
    [usesHonorarium, rateForAmounts],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    if (lastAmountField.current === "net") {
      const n = Math.max(0, Math.round(Number(netStr) || 0));
      if (usesHonorarium) {
        const p = amountsHonorariumWhenNetEdited(n, rateForAmounts);
        setNetStr(String(p.net));
        setTotalStr(String(p.total));
      } else {
        const p = amountsWhenNetEdited(n, rateForAmounts);
        setNetStr(String(p.net));
        setTotalStr(String(p.total));
      }
    } else {
      const g = Math.max(0, Math.round(Number(totalStr) || 0));
      if (usesHonorarium) {
        const p = amountsHonorariumWhenTotalEdited(g, rateForAmounts);
        setNetStr(String(p.net));
        setTotalStr(String(p.total));
      } else {
        const p = amountsWhenTotalEdited(g, rateForAmounts);
        setNetStr(String(p.net));
        setTotalStr(String(p.total));
      }
    }
  }, [open, usesHonorarium, rateForAmounts]);

  const net = Math.max(0, Math.round(Number(netStr) || 0));
  const total = Math.max(0, Math.round(Number(totalStr) || 0));
  const taxAmount = total - net;
  const taxIdForLink =
    initialValues?.taxId ?? (usesHonorarium ? retention.taxId : iva.taxId);

  const handleClose = () => {
    if (isPending) {
      return;
    }
    setError(null);
    onClose();
  };

  const submit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        if (!categoryId) {
          setError("Seleccione una categoría.");
          return;
        }
        if (referenceLoading || reference.status === "error") {
          setError(referenceError ?? "No se pudieron cargar datos de compras.");
          return;
        }
        const supplierId = supplierOpt?.id != null ? String(supplierOpt.id).trim() : "";
        if (!supplierId) {
          setError("Seleccione un proveedor.");
          return;
        }
        if (!referenceNumber.trim()) {
          setError("Indique la referencia (folio del documento).");
          return;
        }
        if (net <= 0 || total <= 0) {
          setError("Indique montos neto y total mayores a cero.");
          return;
        }
        if (!paymentValid) {
          setError(paymentPlanError ?? "Revise el plan de pago del documento.");
          return;
        }

        const r = await createOperationalExpenseAction({
          name: name.trim(),
          categoryId,
          supplierId,
          referenceNumber: referenceNumber.trim(),
          operationDate,
          description,
          documentKind,
          fiscalAmounts: {
            subtotal: net,
            taxAmount,
            total,
            taxId: taxIdForLink ?? null,
          },
          supplierDocumentPayment: paymentPayload,
          saveAsTemplate: hideSaveAsTemplate ? false : saveAsTemplate,
        });
        if (r.success) {
          await onSuccess?.();
          handleClose();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const canSubmitResolved = Boolean(
    name.trim() &&
      categoryId &&
      operationDate &&
      supplierOpt?.id &&
      referenceNumber.trim().length > 0 &&
      net > 0 &&
      total > 0 &&
      !isPending &&
      !referenceLoading &&
      reference.status !== "error" &&
      paymentValid,
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Registro de gasto operativo"
      size="lg"
      scroll="paper"
      data-test-id="operational-expense-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="operational-expense-create-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={submit} disabled={!canSubmitResolved}>
            Registrar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Nombre"
          name="operating-expense-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Nombre"
          data-test-id="operational-expense-name"
        />

        <Select
          label="Categoría de gasto"
          name="operating-expense-category"
          value={categoryId}
          onChange={(id) => setCategoryId(id == null ? null : String(id))}
          options={selectOptions}
          required
          data-test-id="operational-expense-category"
        />

        {referenceError ? (
          <p className="text-sm text-error" role="alert">
            {referenceError}
          </p>
        ) : null}

        <AutoComplete
          label="Proveedor"
          name="operating-expense-supplier"
          placeholder={referenceLoading ? "Cargando…" : "Buscar o seleccionar…"}
          options={supplierOptions}
          value={supplierOpt}
          onChange={(opt) => setSupplierOpt(opt)}
          alwaysShowLabel
          disabled={referenceLoading || Boolean(referenceError)}
          data-test-id="operating-expense-supplier"
        />

        <Select
          label="DTE/Documento"
          name="operating-expense-document-kind"
          value={documentKind}
          onChange={(id) => setDocumentKind(String(id) as OperationalExpenseDocumentKind)}
          options={DOCUMENT_KIND_OPTIONS}
          required
          data-test-id="operating-expense-document-kind"
        />

        <TextField
          label="Referencia"
          name="operating-expense-reference"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          required
          placeholder="Número de factura, boleta u otro documento"
          data-test-id="operational-expense-reference"
        />

        <TextField
          label="Fecha de operación"
          name="operating-expense-operation-date"
          type="date"
          value={operationDate}
          onChange={(e) => setOperationDate(e.target.value)}
          required
          placeholder="Fecha de operación"
          data-test-id="operating-expense-date"
        />

        <TextField
          label="Monto neto"
          name="operating-expense-net"
          type="currency"
          currencySymbol="$"
          startSymbol="$"
          value={netStr}
          onChange={onNetChange}
          data-test-id="operating-expense-net"
        />
        <TextField
          label={usesHonorarium ? "Total (bruto, incluye retención)" : "Total (incluye IVA)"}
          name="operating-expense-total"
          type="currency"
          currencySymbol="$"
          startSymbol="$"
          value={totalStr}
          onChange={onTotalChange}
          data-test-id="operating-expense-total"
        />
        <p className="text-xs text-muted-foreground">
          {usesHonorarium
            ? `Retención honorarios (${retention.rate}%): líquido = total × (1 − tasa/100).`
            : `IVA (${iva.rate}%): montos coherentes con el impuesto "IVA" del catálogo.`}
        </p>

        <PlannedPaymentPlanSection
          disabled={referenceLoading || Boolean(referenceError) || !supplierOpt?.id}
          total={total}
          immediatePaymentDate={operationDate}
          payeeSelected={Boolean(supplierOpt?.id)}
          payeeBankAccounts={payeeBankAccounts}
          companyBankAccounts={companyBankAccounts}
          cashHubOptions={cashHubOptions}
          schedule={paymentSchedule}
          scheduledLinesBehavior="term-chain"
          sectionTitle="Plan de pago"
          totalLabel="total del documento"
          onStateChange={onPaymentStateChange}
          data-test-id="operating-expense-payment-plan"
        />

        <TextField
          label="Descripción (opcional)"
          name="operating-expense-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Descripción (opcional)"
          data-test-id="operational-expense-description"
        />

        {!hideSaveAsTemplate ? (
          <Switch
            checked={saveAsTemplate}
            onChange={setSaveAsTemplate}
            label="Guardar como plantilla"
            labelPosition="right"
            data-test-id="operational-expense-save-as-template"
          />
        ) : null}
      </div>
    </Dialog>
  );
}
