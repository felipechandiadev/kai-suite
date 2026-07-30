"use client";

import { IconButton, SelectDefault as Select, TextField, type Option } from "@kai/ui";
import type { CompanyBankAccountItem } from "@/features/settings-branches/infrastructure/company.request";
import type { PayeeBankAccount } from "@/shared/lib/planned-payment-plan";
import { bankAccountOptionKey } from "@/features/purchasing-dte/lib/planned-payment-helpers";

export type InvoicePlannedPaymentMethodUI = "CASH" | "TRANSFER" | "CHECK";

export type InvoicePlannedPaymentLineState = {
  id: string;
  dueDate: string;
  amountStr: string;
  /** Obligatorio en pagos inmediatos; omitir en cuotas programadas (medio se define al pagar). */
  paymentMethod?: InvoicePlannedPaymentMethodUI;
  companyBankAccountKey: string | null;
  supplierBankAccountKey: string | null;
  chequeNumber: string;
  /** Admin: centro de acopio (efectivo). */
  cashHubId?: string | null;
  /** POS: sesión de caja (efectivo desde cajón). */
  cashSessionId?: string | null;
  /** Legacy / API: banco del cheque; en UI se deriva de la cuenta empresa. */
  chequeBankName?: string;
  /** Nombre del girador (responsable que firma). */
  chequeDrawerName?: string;
  /** Cheque "a fecha" (postdated). */
  chequeDueDate?: string;
};

const METHOD_OPTIONS = [
  { id: "TRANSFER", label: "Transferencia" },
  { id: "CHECK", label: "Cheque" },
  { id: "CASH", label: "Efectivo" },
] as const;

const CASH_SOURCE_OPTIONS = [
  { id: "session", label: "Desde caja" },
  { id: "hub", label: "Desde centro de efectivo" },
] as const;

function accountLabel(a: CompanyBankAccountItem | PayeeBankAccount): string {
  return `${a.bankName} · ${a.accountType} · ${a.accountNumber}`;
}

/** `immediate`: pago al momento (medio de pago requerido). `scheduled`: cuota futura (solo fecha + monto). */
export type InvoicePlannedPaymentLineKind = "immediate" | "scheduled";

/** Admin: solo centro. POS recepción: caja (sesión) o centro. */
export type PlannedPaymentCashSourceMode = "hub_only" | "session_or_hub";

export type InvoicePlannedPaymentLinesProps = {
  disabled: boolean;
  companyBankAccounts: CompanyBankAccountItem[];
  supplierBankAccounts: PayeeBankAccount[];
  /** Centros de acopio para pagos en efectivo (compras / recepción). */
  cashHubOptions?: Option[];
  /**
   * `hub_only` (default): efectivo exige centro.
   * `session_or_hub`: el usuario elige origen caja o centro.
   */
  cashSourceMode?: PlannedPaymentCashSourceMode;
  /** Si es false, no se muestra el botón «+» (p. ej. pago único completado). */
  allowAddLine?: boolean;
  /** Default `immediate`. */
  lineKind?: InvoicePlannedPaymentLineKind;
  lines: InvoicePlannedPaymentLineState[];
  onAddLine: () => void;
  onRemoveLine: (id: string) => void;
  onPatchLine: (id: string, patch: Partial<InvoicePlannedPaymentLineState>) => void;
  /** Reparte el total en montos iguales entre las líneas actuales (fechas se conservan). */
  onDistributeEqual?: () => void;
  /**
   * Texto si no hay líneas. Por defecto: proveedor (pagos inmediatos) o ninguno (cuotas programadas).
   * Pasar `null` para no mostrar mensaje.
   */
  emptyLinesMessage?: string | null;
  /** Pago ejecutado: sin título «Pagos» ni cajas con borde alrededor de los campos. */
  hideSectionChrome?: boolean;
  /** Etiqueta del monto en líneas inmediatas (pago ejecutado). Default: «Monto». */
  immediateAmountLabel?: string;
  /** Etiqueta del selector de centro de efectivo. Default: «Centro de efectivo». */
  cashHubLabel?: string;
  /** Etiqueta de la cuenta bancaria del beneficiario en transferencias. */
  payeeBankAccountLabel?: string;
};

export function InvoicePlannedPaymentLines({
  disabled,
  companyBankAccounts,
  supplierBankAccounts,
  cashHubOptions = [],
  cashSourceMode = "hub_only",
  allowAddLine = true,
  lineKind = "immediate",
  lines,
  onAddLine,
  onRemoveLine,
  onPatchLine,
  onDistributeEqual,
  emptyLinesMessage,
  hideSectionChrome = false,
  immediateAmountLabel = "Monto",
  cashHubLabel = "Centro de efectivo",
  payeeBankAccountLabel = "Cuenta proveedor (destino)",
}: InvoicePlannedPaymentLinesProps) {
  const isScheduled = lineKind === "scheduled";
  const showToolbar = allowAddLine || onDistributeEqual != null;
  const showSectionHeader = !hideSectionChrome && (isScheduled || showToolbar);
  const resolvedEmptyMessage =
    emptyLinesMessage !== undefined
      ? emptyLinesMessage
      : isScheduled
        ? null
        : "Seleccione un proveedor para planificar pagos.";
  const companyOpts = companyBankAccounts.map((a, i) => ({
    id: bankAccountOptionKey(a, i),
    label: accountLabel(a),
  }));
  const supplierOpts = supplierBankAccounts.map((a, i) => ({
    id: bankAccountOptionKey(a, i),
    label: accountLabel(a),
  }));

  const toolbarIconVariant = isScheduled ? "action" : "outlined";

  const outerClassName = hideSectionChrome || isScheduled
    ? "space-y-3"
    : "space-y-3 rounded-lg border border-border bg-muted/20 p-3";
  const lineWrapperClassName =
    hideSectionChrome || isScheduled ? undefined : "rounded-md border border-border/80 bg-background p-3";

  return (
    <div className={outerClassName} data-test-id="invoice-planned-payments">
      {showSectionHeader ? (
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {isScheduled ? "Cuotas programadas" : "Pagos"}
          </h3>
          {showToolbar ? (
            <div className="flex shrink-0 gap-1">
              {onDistributeEqual ? (
                <IconButton
                  type="button"
                  icon="Equal"
                  variant={toolbarIconVariant}
                  size="sm"
                  ariaLabel="Repartir montos en partes iguales"
                  title="Repartir montos en partes iguales"
                  disabled={disabled}
                  onClick={onDistributeEqual}
                  data-test-id="invoice-payment-distribute-equal"
                />
              ) : null}
              {allowAddLine ? (
                <IconButton
                  type="button"
                  icon="Plus"
                  variant={toolbarIconVariant}
                  size="sm"
                  ariaLabel="Agregar línea de pago"
                  disabled={disabled}
                  onClick={onAddLine}
                  data-test-id="invoice-payment-add-line"
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {lines.length === 0 && resolvedEmptyMessage ? (
        <p className="text-sm text-muted-foreground">{resolvedEmptyMessage}</p>
      ) : lines.length > 0 ? (
        <div className={isScheduled ? "space-y-3" : "space-y-4"}>
          {lines.map((line, idx) => (
            <div
              key={line.id}
              className={lineWrapperClassName}
              data-test-id={`invoice-payment-line-${idx}`}
            >
              {!isScheduled && lines.length > 1 ? (
                <div className="mb-2 flex justify-end">
                  <IconButton
                    type="button"
                    icon="Trash2"
                    variant="action"
                    size="sm"
                    ariaLabel="Quitar línea de pago"
                    disabled={disabled}
                    onClick={() => onRemoveLine(line.id)}
                    data-test-id={`invoice-payment-remove-${idx}`}
                  />
                </div>
              ) : null}

              <div
                className={`grid grid-cols-1 gap-3 sm:gap-4 ${
                  isScheduled
                    ? lines.length > 1
                      ? "sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
                      : "sm:grid-cols-2"
                    : "sm:grid-cols-3"
                }`}
              >
                <div className="min-w-0">
                  <TextField
                    label={isScheduled ? "Fecha de vencimiento" : "Fecha de pago"}
                    type="date"
                    value={line.dueDate}
                    onChange={(e) => onPatchLine(line.id, { dueDate: e.target.value })}
                    disabled={disabled}
                  />
                </div>
                <div className="min-w-0">
                  <TextField
                    label={isScheduled ? "Monto" : immediateAmountLabel}
                    type="currency"
                    currencySymbol="$"
                    startSymbol="$"
                    value={line.amountStr}
                    onChange={(e) => onPatchLine(line.id, { amountStr: e.target.value })}
                    disabled={disabled}
                  />
                </div>
                {isScheduled && lines.length > 1 ? (
                  <div className="flex justify-end sm:pb-1">
                    <IconButton
                      type="button"
                      icon="Trash2"
                      variant="action"
                      size="sm"
                      ariaLabel="Quitar cuota"
                      disabled={disabled}
                      onClick={() => onRemoveLine(line.id)}
                      data-test-id={`invoice-payment-remove-${idx}`}
                    />
                  </div>
                ) : null}
                {!isScheduled ? (
                  <div className="min-w-0">
                    <Select
                      label="Medio de pago"
                      alwaysShowLabel
                      options={[...METHOD_OPTIONS]}
                      value={line.paymentMethod ?? "CASH"}
                      onChange={(id) => {
                        const nextMethod = (id ?? "CASH") as InvoicePlannedPaymentMethodUI;
                        const autoHub =
                          nextMethod === "CASH" &&
                          cashSourceMode === "hub_only" &&
                          cashHubOptions[0]
                            ? String(cashHubOptions[0].id)
                            : null;
                        onPatchLine(line.id, {
                          paymentMethod: nextMethod,
                          cashHubId:
                            nextMethod === "CASH"
                              ? cashSourceMode === "hub_only"
                                ? autoHub ?? line.cashHubId
                                : null
                              : null,
                          cashSessionId: nextMethod === "CASH" ? null : null,
                        });
                      }}
                      disabled={disabled}
                      data-test-id={`invoice-payment-method-${idx}`}
                    />
                  </div>
                ) : null}
              </div>

              {!isScheduled && line.paymentMethod === "TRANSFER" ? (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                  <div className="min-w-0">
                    <Select
                      label="Cuenta empresa (origen)"
                      alwaysShowLabel
                      placeholder={companyOpts.length ? "Seleccione…" : "Sin cuentas en empresa"}
                      options={companyOpts}
                      value={line.companyBankAccountKey}
                      onChange={(id) =>
                        onPatchLine(line.id, { companyBankAccountKey: id != null ? String(id) : null })
                      }
                      disabled={disabled || companyOpts.length === 0}
                    />
                  </div>
                  <div className="min-w-0">
                    <Select
                      label={payeeBankAccountLabel}
                      alwaysShowLabel
                      placeholder={supplierOpts.length ? "Seleccione…" : "Sin cuentas del proveedor"}
                      options={supplierOpts}
                      value={line.supplierBankAccountKey}
                      onChange={(id) =>
                        onPatchLine(line.id, { supplierBankAccountKey: id != null ? String(id) : null })
                      }
                      disabled={disabled || supplierOpts.length === 0}
                    />
                  </div>
                </div>
              ) : null}

              {!isScheduled && line.paymentMethod === "CASH" && cashSourceMode === "session_or_hub" ? (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                  <div className="min-w-0">
                    <Select
                      label="Origen del efectivo"
                      alwaysShowLabel
                      options={[...CASH_SOURCE_OPTIONS]}
                      value={line.cashHubId?.trim() ? "hub" : "session"}
                      onChange={(id) => {
                        if (id === "hub") {
                          onPatchLine(line.id, {
                            cashHubId: cashHubOptions[0] ? String(cashHubOptions[0].id) : null,
                            cashSessionId: null,
                          });
                          return;
                        }
                        onPatchLine(line.id, { cashHubId: null, cashSessionId: null });
                      }}
                      disabled={disabled}
                      data-test-id={`invoice-payment-cash-source-${idx}`}
                    />
                  </div>
                  {line.cashHubId?.trim() ? (
                    <div className="min-w-0">
                      <Select
                        label={cashHubLabel}
                        alwaysShowLabel
                        placeholder={
                          cashHubOptions.length ? "Seleccione…" : "Sin centros configurados"
                        }
                        options={cashHubOptions}
                        value={line.cashHubId ?? null}
                        onChange={(id) =>
                          onPatchLine(line.id, {
                            cashHubId: id != null ? String(id) : null,
                            cashSessionId: null,
                          })
                        }
                        disabled={disabled || cashHubOptions.length === 0}
                        data-test-id={`invoice-payment-cash-hub-${idx}`}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {!isScheduled &&
              line.paymentMethod === "CASH" &&
              cashSourceMode !== "session_or_hub" &&
              cashHubOptions.length > 0 ? (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                  <div className="min-w-0">
                    <Select
                      label={cashHubLabel}
                      alwaysShowLabel
                      placeholder="Seleccione…"
                      options={cashHubOptions}
                      value={line.cashHubId ?? null}
                      onChange={(id) => onPatchLine(line.id, { cashHubId: id != null ? String(id) : null })}
                      disabled={disabled}
                      data-test-id={`invoice-payment-cash-hub-${idx}`}
                    />
                  </div>
                </div>
              ) : null}

              {!isScheduled && line.paymentMethod === "CHECK" ? (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                  <div className="min-w-0">
                    <Select
                      label="Cuenta empresa (cheque)"
                      alwaysShowLabel
                      placeholder={companyOpts.length ? "Seleccione…" : "Sin cuentas en empresa"}
                      options={companyOpts}
                      value={line.companyBankAccountKey}
                      onChange={(id) =>
                        onPatchLine(line.id, { companyBankAccountKey: id != null ? String(id) : null })
                      }
                      disabled={disabled || companyOpts.length === 0}
                    />
                  </div>
                  <div className="min-w-0">
                    <TextField
                      label="Número de cheque"
                      value={line.chequeNumber}
                      onChange={(e) => onPatchLine(line.id, { chequeNumber: e.target.value })}
                      disabled={disabled}
                    />
                  </div>
                  <div className="min-w-0">
                    <TextField
                      label="Girador"
                      value={line.chequeDrawerName ?? ""}
                      onChange={(e) =>
                        onPatchLine(line.id, { chequeDrawerName: e.target.value })
                      }
                      disabled={disabled}
                      placeholder="Responsable que firma"
                    />
                  </div>
                  <div className="min-w-0">
                    <TextField
                      label="A fecha (opcional)"
                      type="date"
                      value={line.chequeDueDate ?? ""}
                      onChange={(e) =>
                        onPatchLine(line.id, { chequeDueDate: e.target.value })
                      }
                      disabled={disabled}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
