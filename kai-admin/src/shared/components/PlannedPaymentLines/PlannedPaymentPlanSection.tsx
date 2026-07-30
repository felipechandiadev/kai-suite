"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import type { Option } from "@kai/ui";
import type { CompanyBankAccountItem } from "@/features/settings-branches/infrastructure/company.request";
import type { PlannedPaymentPayload } from "@/shared/lib/planned-payment-plan";
import {
  buildPlannedPaymentPayload,
  validatePlannedPaymentPlanClient,
} from "@/shared/lib/planned-payment-plan";
import type { PayeeBankAccount } from "@/shared/lib/planned-payment-plan";
import { toYyyyMmDdLocal } from "@/features/purchasing-dte/lib/planned-payment-helpers";
import { PlannedPaymentDefinitionSection } from "./PlannedPaymentDefinitionSection";
import {
  usePlannedPaymentDefinition,
  type PlannedPaymentDefinitionControlledState,
  type PlannedPaymentScheduledLinesBehavior,
} from "./usePlannedPaymentDefinition";
import type { PlannedPaymentMode } from "./planned-payment-mode.types";
import type { PlannedPaymentScheduleConfig } from "./planned-payment-definition.schedule";
import type { PlannedPaymentCashSourceMode } from "./InvoicePlannedPaymentLines";

export type PlannedPaymentPlanSectionState = {
  payload: PlannedPaymentPayload;
  valid: boolean;
  error: string | null;
};

export type PlannedPaymentPlanSectionProps = {
  disabled?: boolean;
  total: number;
  immediatePaymentDate: string;
  payeeSelected: boolean;
  payeeBankAccounts: PayeeBankAccount[];
  companyBankAccounts: CompanyBankAccountItem[];
  cashHubOptions?: Option[];
  cashSourceMode?: PlannedPaymentCashSourceMode;
  schedule: PlannedPaymentScheduleConfig;
  scheduledLinesBehavior: PlannedPaymentScheduledLinesBehavior;
  sectionTitle?: string;
  headerExtra?: ReactNode;
  payeeRequiredMessage?: string | null;
  payeeBankAccountLabel?: string;
  allowedModes?: PlannedPaymentMode[];
  /** Validación estricta cuando el total es cero (nómina). */
  strictZeroTotal?: boolean;
  totalLabel?: string;
  controlled?: PlannedPaymentDefinitionControlledState;
  syncPaused?: boolean;
  /** Restaura borrador (p. ej. diálogo de recepción). */
  initialDraft?: PlannedPaymentPayload | null;
  /** Cambia cuando el contenedor se abre para aplicar `initialDraft`. */
  hydrateKey?: string | number | boolean;
  onStateChange?: (state: PlannedPaymentPlanSectionState) => void;
  "data-test-id"?: string;
  paymentModeSelectName?: string;
  partialAmountTestId?: string;
  scheduleBalanceHintVariant?: "plain" | "bordered";
};

export function PlannedPaymentPlanSection({
  disabled = false,
  total,
  immediatePaymentDate,
  payeeSelected,
  payeeBankAccounts,
  companyBankAccounts,
  cashHubOptions = [],
  cashSourceMode = "hub_only",
  schedule,
  scheduledLinesBehavior,
  sectionTitle,
  headerExtra,
  payeeRequiredMessage = null,
  payeeBankAccountLabel = "Cuenta proveedor (destino)",
  allowedModes,
  strictZeroTotal = false,
  totalLabel = "total",
  controlled,
  syncPaused = false,
  initialDraft,
  hydrateKey,
  onStateChange,
  "data-test-id": dataTestId = "planned-payment-plan-section",
  paymentModeSelectName = "planned-payment-plan-mode",
  partialAmountTestId = "planned-payment-plan-partial",
  scheduleBalanceHintVariant = "plain",
}: PlannedPaymentPlanSectionProps) {
  const hydratedRef = useRef<string | number | boolean | undefined>(undefined);
  const draftSyncPaused = initialDraft != null && hydratedRef.current !== hydrateKey;

  const definition = usePlannedPaymentDefinition({
    total,
    payeeSelected,
    disabled,
    immediatePaymentDate: immediatePaymentDate || toYyyyMmDdLocal(new Date()),
    schedule,
    scheduledLinesBehavior,
    companyBankAccounts,
    payeeBankAccounts,
    cashHubOptions,
    cashSourceMode,
    controlled,
    syncPaused: syncPaused || draftSyncPaused,
  });

  useEffect(() => {
    if (initialDraft == null || controlled == null || hydrateKey === undefined) {
      return;
    }
    if (hydratedRef.current === hydrateKey) {
      return;
    }
    hydratedRef.current = hydrateKey;
    const h = initialDraft;
    controlled.onPaymentModeChange(h.mode);
    controlled.onPartialAmountStrChange(
      h.mode === "PARTIAL" ? String(Math.max(0, Math.round(h.partialPaidAmount ?? 0))) : "0",
    );
    controlled.onPaidLinesChange(
      h.paidLines.map((p) => ({
        id: crypto.randomUUID(),
        dueDate: p.dueDate,
        amountStr: String(Math.round(p.amount)),
        paymentMethod: p.paymentMethod ?? "CASH",
        companyBankAccountKey: p.companyBankAccountKey ?? null,
        supplierBankAccountKey: p.supplierBankAccountKey ?? null,
        chequeNumber: p.chequeNumber ?? "",
        cashHubId: p.cashHubId ?? null,
        cashSessionId: p.cashSessionId ?? null,
      })),
    );
    controlled.onScheduledLinesChange(
      h.scheduledLines.map((p) => ({
        id: crypto.randomUUID(),
        dueDate: p.dueDate,
        amountStr: String(Math.round(p.amount)),
        companyBankAccountKey: null,
        supplierBankAccountKey: null,
        chequeNumber: "",
      })),
    );
  }, [initialDraft, controlled, hydrateKey]);

  const effectiveMode = useMemo(() => {
    if (allowedModes?.length === 1) {
      return allowedModes[0]!;
    }
    return definition.paymentMode;
  }, [allowedModes, definition.paymentMode]);

  useEffect(() => {
    if (allowedModes?.length === 1 && definition.paymentMode !== allowedModes[0]) {
      definition.setPaymentMode(allowedModes[0]!);
    }
  }, [allowedModes, definition.paymentMode, definition.setPaymentMode]);

  const payload = useMemo(
    () =>
      buildPlannedPaymentPayload({
        mode: effectiveMode,
        partialAmount: definition.partialAmount,
        paidLines: definition.paidLines,
        scheduledLines: definition.scheduledLines,
      }),
    [
      effectiveMode,
      definition.partialAmount,
      definition.paidLines,
      definition.scheduledLines,
    ],
  );

  const validationError = useMemo(
    () =>
      validatePlannedPaymentPlanClient({
        mode: effectiveMode,
        total: Math.max(0, Math.round(total || 0)),
        partialAmount: definition.partialAmount,
        partialAmountStr: definition.partialAmountStr,
        paidLines: definition.paidLines,
        scheduledLines: definition.scheduledLines,
        scheduleAmountError: definition.scheduleAmountError,
        hasCashHubOptions: cashHubOptions.length > 0,
        payeeSelected,
        strictZeroTotal,
        totalLabel,
        cashSourceMode,
      }),
    [
      effectiveMode,
      total,
      definition.partialAmount,
      definition.partialAmountStr,
      definition.paidLines,
      definition.scheduledLines,
      definition.scheduleAmountError,
      cashHubOptions.length,
      payeeSelected,
      strictZeroTotal,
      totalLabel,
      cashSourceMode,
    ],
  );

  useEffect(() => {
    onStateChange?.({
      payload,
      valid: validationError == null,
      error: validationError,
    });
  }, [payload, validationError, onStateChange]);

  const showModeSelect = !allowedModes || allowedModes.length !== 1;

  return (
    <PlannedPaymentDefinitionSection
      {...definition}
      paymentMode={effectiveMode}
      setPaymentMode={definition.setPaymentMode}
      sectionTitle={sectionTitle}
      headerExtra={headerExtra}
      payeeRequiredMessage={payeeRequiredMessage}
      payeeBankAccountLabel={payeeBankAccountLabel}
      showModeSelect={showModeSelect}
      data-test-id={dataTestId}
      paymentModeSelectName={paymentModeSelectName}
      partialAmountTestId={partialAmountTestId}
      scheduleBalanceHintVariant={scheduleBalanceHintVariant}
    />
  );
}
