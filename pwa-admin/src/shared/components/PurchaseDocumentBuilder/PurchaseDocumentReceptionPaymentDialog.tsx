"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog } from "@kai/ui";
import { Button } from "@kai/ui";
import { Alert } from "@kai/ui";
import type { Option } from "@kai/ui";
import type { SupplierGridRow } from "@/features/purchasing-suppliers/types/supplier.types";
import type { CompanyBankAccountItem } from "@/features/settings-branches/infrastructure/company.request";
import type { ReceptionSupplierDocumentPaymentPayload } from "@/features/receptions/types/reception-document-payment.types";
import { PlannedPaymentPlanSection } from "@/shared/components/PlannedPaymentLines";
import { formatMoney } from "./PurchaseDocumentProductPreview";

export type PaymentCashContext = "admin_cash_hub" | "pos_cash_session";

export type PurchaseDocumentReceptionPaymentDialogProps = {
  open: boolean;
  onClose: () => void;
  onApply: (payload: ReceptionSupplierDocumentPaymentPayload) => void;
  documentTotal: number;
  docDate: string;
  supplier: SupplierGridRow | null;
  companyBankAccounts: CompanyBankAccountItem[];
  cashHubOptions: Option[];
  referenceLoading: boolean;
  initialDraft?: ReceptionSupplierDocumentPaymentPayload | null;
  paymentCashContext?: PaymentCashContext;
};

export function PurchaseDocumentReceptionPaymentDialog({
  open,
  onClose,
  onApply,
  documentTotal,
  docDate,
  supplier,
  companyBankAccounts,
  cashHubOptions,
  referenceLoading,
  initialDraft,
  paymentCashContext = "admin_cash_hub",
}: PurchaseDocumentReceptionPaymentDialogProps) {
  const cashSourceMode =
    paymentCashContext === "pos_cash_session" ? "session_or_hub" : "hub_only";
  const [localError, setLocalError] = useState<string | null>(null);
  const [paymentPayload, setPaymentPayload] = useState<ReceptionSupplierDocumentPaymentPayload>({
    mode: "PENDING",
    paidLines: [],
    scheduledLines: [],
  });
  const [paymentValid, setPaymentValid] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [paymentMode, setPaymentMode] = useState<ReceptionSupplierDocumentPaymentPayload["mode"]>("PENDING");
  const [partialAmountStr, setPartialAmountStr] = useState("0");
  const [paidLines, setPaidLines] = useState<
    import("@/shared/components/PlannedPaymentLines").InvoicePlannedPaymentLineState[]
  >([]);
  const [scheduledLines, setScheduledLines] = useState<
    import("@/shared/components/PlannedPaymentLines").InvoicePlannedPaymentLineState[]
  >([]);

  const payeeBankAccounts = useMemo(() => {
    const raw = supplier?.person?.bankAccounts;
    return raw != null && raw.length > 0 ? raw : [];
  }, [supplier?.person?.bankAccounts]);

  const total = Math.max(0, Math.round(documentTotal || 0));

  useEffect(() => {
    if (!open) {
      return;
    }
    if (initialDraft) {
      return;
    }
    setPaymentMode("PENDING");
    setPartialAmountStr("0");
    setPaidLines([]);
    setScheduledLines([]);
    setLocalError(null);
  }, [open, initialDraft]);

  const onPaymentStateChange = useCallback(
    (state: {
      payload: ReceptionSupplierDocumentPaymentPayload;
      valid: boolean;
      error: string | null;
    }) => {
      setPaymentPayload(state.payload);
      setPaymentValid(state.valid);
      setValidationError(state.error);
    },
    [],
  );

  const validateAndApply = () => {
    setLocalError(null);
    if (!supplier?.id) {
      setLocalError("Seleccione un proveedor.");
      return;
    }
    if (!paymentValid) {
      setLocalError(validationError ?? "Revise el plan de pago.");
      return;
    }
    onApply(paymentPayload);
    onClose();
  };

  const disabledInner = referenceLoading || !supplier?.id;
  const displayError = localError ?? (open && !paymentValid ? validationError : null);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Pago del documento (factura / boleta)"
      size="xl"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="purchase-doc-reception-payment-dialog"
      actions={
        <div className="flex w-full flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            size="md"
            type="button"
            onClick={onClose}
            data-test-id="purchase-doc-reception-payment-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            type="button"
            onClick={validateAndApply}
            data-test-id="purchase-doc-reception-payment-apply"
          >
            Aplicar
          </Button>
        </div>
      }
      actionsJustify="end"
    >
      <div className="flex flex-col gap-4 text-sm">
        <div className="rounded-lg border border-border bg-muted/15 p-3">
          <p className="text-muted-foreground">Total documento (líneas)</p>
          <p className="text-lg font-semibold tabular-nums text-foreground">{formatMoney(total)}</p>
        </div>

        {displayError ? (
          <Alert variant="error" data-test-id="purchase-doc-reception-payment-error">
            {displayError}
          </Alert>
        ) : null}

        <PlannedPaymentPlanSection
          disabled={disabledInner}
          total={total}
          immediatePaymentDate={docDate}
          payeeSelected={Boolean(supplier?.id)}
          payeeBankAccounts={payeeBankAccounts}
          companyBankAccounts={companyBankAccounts}
          cashHubOptions={cashHubOptions}
          cashSourceMode={cashSourceMode}
          schedule={{ kind: "monthly-chain" }}
          scheduledLinesBehavior="term-chain"
          sectionTitle="Estado de pago del documento"
          payeeRequiredMessage={
            !supplier?.id ? "Seleccione un proveedor en el encabezado." : null
          }
          totalLabel="total del documento"
          controlled={{
            paymentMode,
            onPaymentModeChange: setPaymentMode,
            partialAmountStr,
            onPartialAmountStrChange: setPartialAmountStr,
            paidLines,
            onPaidLinesChange: setPaidLines,
            scheduledLines,
            onScheduledLinesChange: setScheduledLines,
          }}
          initialDraft={initialDraft ?? null}
          hydrateKey={open}
          onStateChange={onPaymentStateChange}
          data-test-id="purchase-doc-reception-payment-plan"
          paymentModeSelectName="purchase-doc-reception-payment-mode"
        />
      </div>
    </Dialog>
  );
}
