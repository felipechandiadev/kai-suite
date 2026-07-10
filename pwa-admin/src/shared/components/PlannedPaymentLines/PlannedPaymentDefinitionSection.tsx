"use client";

import type { ReactNode } from "react";
import { TextField } from "@kai/ui";
import { InvoicePlannedPaymentLines } from "./InvoicePlannedPaymentLines";
import { PlannedPaymentModeSelect } from "./PlannedPaymentModeSelect";
import type { PlannedPaymentDefinitionViewModel } from "./usePlannedPaymentDefinition";

function formatMoney(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export type PlannedPaymentDefinitionSectionProps = PlannedPaymentDefinitionViewModel & {
  /** Encabezado opcional sobre el selector (p. ej. «Pago del documento»). */
  sectionTitle?: string;
  /** Texto o bloque bajo el título (p. ej. líquido a pagar). */
  headerExtra?: ReactNode;
  /** Si el beneficiario no está seleccionado. */
  payeeRequiredMessage?: string | null;
  payeeBankAccountLabel?: string;
  showModeSelect?: boolean;
  paymentModeSelectName?: string;
  "data-test-id"?: string;
  partialAmountTestId?: string;
  showScheduleBalanceHint?: boolean;
  scheduleBalanceHintVariant?: "plain" | "bordered";
};

export function PlannedPaymentDefinitionSection({
  sectionTitle,
  headerExtra,
  payeeRequiredMessage = null,
  payeeBankAccountLabel = "Cuenta proveedor (destino)",
  showModeSelect = true,
  paymentModeSelectName = "planned-payment-definition-mode",
  "data-test-id": dataTestId = "planned-payment-definition-section",
  partialAmountTestId = "planned-payment-partial-amount",
  showScheduleBalanceHint = true,
  scheduleBalanceHintVariant = "plain",
  paymentMode,
  setPaymentMode,
  partialAmountStr,
  onPartialAmountChange,
  partialAmountDefined,
  scheduleTotal,
  disabledInner,
  showCompletedLines,
  showScheduledLines,
  paidLines,
  scheduledLines,
  patchPaid,
  patchSched,
  addScheduledLine,
  removeScheduledLine,
  redistributeScheduledEqual,
  companyBankAccounts,
  payeeBankAccounts,
  cashHubOptions,
}: PlannedPaymentDefinitionSectionProps) {
  const showPartialField = paymentMode === "PARTIAL";
  const showBalanceHint =
    showScheduleBalanceHint &&
    paymentMode === "PARTIAL" &&
    partialAmountDefined &&
    scheduleTotal > 0;

  const balanceHint = showBalanceHint ? (
    scheduleBalanceHintVariant === "bordered" ? (
      <div className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Saldo en cuotas:</span>{" "}
        <span className="tabular-nums">{formatMoney(scheduleTotal)}</span>
      </div>
    ) : (
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Saldo en cuotas:</span>{" "}
        <span className="tabular-nums">{formatMoney(scheduleTotal)}</span>
      </p>
    )
  ) : null;

  return (
    <div className="flex flex-col gap-3" data-test-id={dataTestId}>
      {sectionTitle ? (
        <p className="text-sm font-semibold text-foreground">{sectionTitle}</p>
      ) : null}
      {headerExtra}

      {showModeSelect ? (
        <PlannedPaymentModeSelect
          value={paymentMode}
          onChange={setPaymentMode}
          disabled={disabledInner}
          name={paymentModeSelectName}
          data-test-id={`${dataTestId}-mode`}
        />
      ) : null}

      {showPartialField ? (
        <TextField
          label="Monto ya pagado (CLP)"
          type="currency"
          currencySymbol="$"
          startSymbol="$"
          value={partialAmountStr}
          onChange={(e) => onPartialAmountChange(e.target.value)}
          disabled={disabledInner}
          data-test-id={partialAmountTestId}
        />
      ) : null}

      {balanceHint}

      {payeeRequiredMessage ? (
        <p className="text-sm text-muted-foreground">{payeeRequiredMessage}</p>
      ) : null}

      {showCompletedLines ? (
        <InvoicePlannedPaymentLines
          disabled={disabledInner}
          hideSectionChrome
          companyBankAccounts={companyBankAccounts}
          supplierBankAccounts={payeeBankAccounts}
          payeeBankAccountLabel={payeeBankAccountLabel}
          cashHubOptions={cashHubOptions}
          allowAddLine={false}
          lines={paidLines}
          onAddLine={() => {}}
          onRemoveLine={() => {}}
          onPatchLine={patchPaid}
        />
      ) : null}

      {showScheduledLines ? (
        <InvoicePlannedPaymentLines
          disabled={disabledInner}
          lineKind="scheduled"
          companyBankAccounts={companyBankAccounts}
          supplierBankAccounts={payeeBankAccounts}
          payeeBankAccountLabel={payeeBankAccountLabel}
          cashHubOptions={cashHubOptions}
          lines={scheduledLines}
          onAddLine={addScheduledLine}
          onRemoveLine={removeScheduledLine}
          onPatchLine={patchSched}
          onDistributeEqual={
            scheduledLines.length > 0 ? redistributeScheduledEqual : undefined
          }
        />
      ) : null}
    </div>
  );
}
