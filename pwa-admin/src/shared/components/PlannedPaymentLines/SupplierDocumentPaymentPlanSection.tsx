"use client";

import { useCallback, useMemo } from "react";
import type { Option } from "@kai/ui";
import type { CompanyBankAccountItem } from "@/features/settings-branches/infrastructure/company.request";
import type { SupplierGridRow } from "@/features/purchasing-suppliers/types/supplier.types";
import type { ReceptionSupplierDocumentPaymentPayload } from "@/features/receptions/types/reception-document-payment.types";
import { toYyyyMmDdLocal } from "@/features/purchasing-dte/lib/planned-payment-helpers";
import { PlannedPaymentPlanSection } from "./PlannedPaymentPlanSection";

const EMPTY_SUPPLIER_BANKS: import("@/shared/lib/planned-payment-plan").PayeeBankAccount[] = [];

export type SupplierDocumentPaymentPlanSectionProps = {
  disabled?: boolean;
  documentTotal: number;
  docDate: string;
  supplier: SupplierGridRow | null;
  companyBankAccounts: CompanyBankAccountItem[];
  cashHubOptions: Option[];
  sectionTitle?: string;
  onStateChange: (state: {
    payload: ReceptionSupplierDocumentPaymentPayload;
    valid: boolean;
    error: string | null;
  }) => void;
};

export function SupplierDocumentPaymentPlanSection({
  disabled = false,
  documentTotal,
  docDate,
  supplier,
  companyBankAccounts,
  cashHubOptions,
  sectionTitle = "Pago del documento",
  onStateChange,
}: SupplierDocumentPaymentPlanSectionProps) {
  const payeeBankAccounts = useMemo(() => {
    const raw = supplier?.person?.bankAccounts;
    return raw != null && raw.length > 0 ? raw : EMPTY_SUPPLIER_BANKS;
  }, [supplier?.person?.bankAccounts]);

  const supplierSelected = Boolean(supplier?.id);

  const handleStateChange = useCallback(
    (state: {
      payload: ReceptionSupplierDocumentPaymentPayload;
      valid: boolean;
      error: string | null;
    }) => {
      onStateChange(state);
    },
    [onStateChange],
  );

  return (
    <PlannedPaymentPlanSection
      disabled={disabled}
      total={documentTotal}
      immediatePaymentDate={docDate || toYyyyMmDdLocal(new Date())}
      payeeSelected={supplierSelected}
      payeeBankAccounts={payeeBankAccounts}
      companyBankAccounts={companyBankAccounts}
      cashHubOptions={cashHubOptions}
      schedule={{ kind: "monthly-chain" }}
      scheduledLinesBehavior="term-chain"
      sectionTitle={sectionTitle}
      totalLabel="total del documento"
      onStateChange={handleStateChange}
      data-test-id="supplier-document-payment-plan-section"
      paymentModeSelectName="supplier-document-payment-mode"
      partialAmountTestId="supplier-document-payment-partial"
    />
  );
}
