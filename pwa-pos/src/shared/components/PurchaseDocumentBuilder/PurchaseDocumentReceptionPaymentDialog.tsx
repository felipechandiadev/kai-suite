"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@kai/ui";
import { Button } from "@kai/ui";
import { Alert } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Select, type Option } from "@kai/ui";
import type {
  SupplierGridRow,
  SupplierPersonBankAccount,
} from "@/features/purchasing-reception/types/supplier.types";
import type { CompanyBankAccountItem } from "@/features/purchasing-reception/types/company.types";
import type {
  ReceptionDocumentPaymentMode,
  ReceptionPlannedPaymentLinePayload,
  ReceptionSupplierDocumentPaymentPayload,
} from "@/features/purchasing-reception/types/reception-document-payment.types";
import {
  addCalendarDays,
  bankAccountOptionKey,
  parseClpAmountInput,
  parseYyyyMmDdLocal,
  splitTotalAcrossLines,
  toYyyyMmDdLocal,
} from "@/features/purchasing-reception/lib/planned-payment-helpers";
import {
  InvoicePlannedPaymentLines,
  type InvoicePlannedPaymentLineState,
  type InvoicePlannedPaymentMethodUI,
} from "@/shared/components/PlannedPaymentLines/InvoicePlannedPaymentLines";
import { formatMoney } from "./PurchaseDocumentProductPreview";

const MODE_OPTIONS: Option[] = [
  { id: "PENDING", label: "Pago pendiente (sin plan en pantalla)" },
  { id: "PENDING_SCHEDULED", label: "Pago pendiente con cuotas programadas" },
  { id: "PARTIAL", label: "Pago parcial + saldo en cuotas" },
  { id: "COMPLETED", label: "Pago completado (documento pagado)" },
];

const EMPTY_SUPPLIER_BANK_ACCOUNTS: SupplierPersonBankAccount[] = [];

function defaultPaymentMethod(
  companyHasBanks: boolean,
  supplierHasBanks: boolean,
): InvoicePlannedPaymentMethodUI {
  return companyHasBanks && supplierHasBanks ? "TRANSFER" : "CASH";
}

function newScheduledLineFromTemplate(args: {
  dueDate: string;
  amountStr: string;
}): InvoicePlannedPaymentLineState {
  return {
    id: crypto.randomUUID(),
    dueDate: args.dueDate,
    amountStr: args.amountStr,
    companyBankAccountKey: null,
    supplierBankAccountKey: null,
    chequeNumber: "",
  };
}

function newImmediateLineFromTemplate(args: {
  dueDate: string;
  amountStr: string;
  companyHasBanks: boolean;
  supplierHasBanks: boolean;
  companyBankAccounts: CompanyBankAccountItem[];
  supplierBankAccounts: SupplierPersonBankAccount[];
  cashHubOptions: Option[];
}): InvoicePlannedPaymentLineState {
  const dm = defaultPaymentMethod(args.companyHasBanks, args.supplierHasBanks);
  const firstHub = args.cashHubOptions[0];
  return {
    id: crypto.randomUUID(),
    dueDate: args.dueDate,
    amountStr: args.amountStr,
    paymentMethod: dm,
    companyBankAccountKey:
      args.companyBankAccounts[0] != null ? bankAccountOptionKey(args.companyBankAccounts[0], 0) : null,
    supplierBankAccountKey:
      args.supplierBankAccounts[0] != null
        ? bankAccountOptionKey(args.supplierBankAccounts[0], 0)
        : null,
    chequeNumber: "",
    cashHubId: dm === "CASH" && firstHub ? String(firstHub.id) : null,
  };
}

function immediateLineToPayload(
  l: InvoicePlannedPaymentLineState,
  isPosCash: boolean,
): ReceptionPlannedPaymentLinePayload {
  const pm = l.paymentMethod ?? "CASH";
  return {
    dueDate: l.dueDate,
    amount: parseClpAmountInput(l.amountStr),
    paymentMethod: pm,
    companyBankAccountKey:
      pm === "TRANSFER" || pm === "CHECK" ? l.companyBankAccountKey : null,
    supplierBankAccountKey: pm === "TRANSFER" ? l.supplierBankAccountKey : null,
    chequeNumber: pm === "CHECK" ? String(l.chequeNumber).trim() || null : null,
    cashHubId:
      pm === "CASH" && !isPosCash ? (l.cashHubId?.trim() ? l.cashHubId.trim() : null) : null,
    cashSessionId: pm === "CASH" && isPosCash ? l.cashSessionId?.trim() || null : null,
  };
}

function scheduledLineToPayload(l: InvoicePlannedPaymentLineState): ReceptionPlannedPaymentLinePayload {
  return {
    dueDate: l.dueDate,
    amount: parseClpAmountInput(l.amountStr),
  };
}

function applyEqualAmounts(
  lines: InvoicePlannedPaymentLineState[],
  amountTotal: number,
): InvoicePlannedPaymentLineState[] {
  if (lines.length === 0) {
    return lines;
  }
  const parts = splitTotalAcrossLines(amountTotal, lines.length);
  return lines.map((l, i) => ({ ...l, amountStr: String(parts[i] ?? 0) }));
}

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
  paymentCashContext = "pos_cash_session",
}: PurchaseDocumentReceptionPaymentDialogProps) {
  const isPosCash = paymentCashContext === "pos_cash_session";
  const [paymentMode, setPaymentMode] = useState<ReceptionDocumentPaymentMode>("PENDING");
  const [partialAmountStr, setPartialAmountStr] = useState("0");
  const [paidLines, setPaidLines] = useState<InvoicePlannedPaymentLineState[]>([]);
  const [scheduledLines, setScheduledLines] = useState<InvoicePlannedPaymentLineState[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const manualPaidLockRef = useRef(false);
  const manualSchedLockRef = useRef(false);

  const supplierBankAccounts = useMemo((): SupplierPersonBankAccount[] => {
    const raw = supplier?.person?.bankAccounts;
    if (raw != null && raw.length > 0) {
      return raw;
    }
    return EMPTY_SUPPLIER_BANK_ACCOUNTS;
  }, [supplier?.person?.bankAccounts]);

  const total = Math.max(0, Math.round(documentTotal || 0));
  const partialAmount = paymentMode === "PARTIAL" ? parseClpAmountInput(partialAmountStr) : 0;
  const scheduleTotal =
    paymentMode === "PARTIAL" ? Math.max(0, total - partialAmount) : paymentMode === "PENDING_SCHEDULED" ? total : 0;

  const resetToDefaults = useCallback(() => {
    setPaymentMode("PENDING");
    setPartialAmountStr("0");
    setPaidLines([]);
    setScheduledLines([]);
    setLocalError(null);
    manualPaidLockRef.current = false;
    manualSchedLockRef.current = false;
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (initialDraft) {
      setPaymentMode(initialDraft.mode);
      setPartialAmountStr(
        initialDraft.mode === "PARTIAL" ? String(Math.max(0, Math.round(initialDraft.partialPaidAmount ?? 0))) : "0",
      );
      const mapPaidPayloadLine = (p: ReceptionPlannedPaymentLinePayload): InvoicePlannedPaymentLineState => ({
        id: crypto.randomUUID(),
        dueDate: p.dueDate,
        amountStr: String(Math.round(p.amount)),
        paymentMethod: p.paymentMethod ?? "CASH",
        companyBankAccountKey: p.companyBankAccountKey ?? null,
        supplierBankAccountKey: p.supplierBankAccountKey ?? null,
        chequeNumber: p.chequeNumber ?? "",
        cashHubId: p.cashHubId ?? null,
        cashSessionId: p.cashSessionId ?? null,
      });
      const mapScheduledPayloadLine = (p: ReceptionPlannedPaymentLinePayload): InvoicePlannedPaymentLineState => ({
        id: crypto.randomUUID(),
        dueDate: p.dueDate,
        amountStr: String(Math.round(p.amount)),
        companyBankAccountKey: null,
        supplierBankAccountKey: null,
        chequeNumber: "",
      });
      setPaidLines(initialDraft.paidLines.map(mapPaidPayloadLine));
      setScheduledLines(initialDraft.scheduledLines.map(mapScheduledPayloadLine));
      manualPaidLockRef.current = true;
      manualSchedLockRef.current = true;
      return;
    }
    resetToDefaults();
  }, [open, initialDraft, resetToDefaults]);

  const companyHasBanks = companyBankAccounts.length > 0;
  const supplierHasBanks = supplierBankAccounts.length > 0;

  const firstDueScheduled = useMemo(() => {
    const term = supplier?.defaultPaymentTermDays ?? 0;
    const base = parseYyyyMmDdLocal(docDate || toYyyyMmDdLocal(new Date()));
    return toYyyyMmDdLocal(addCalendarDays(base, term));
  }, [supplier?.defaultPaymentTermDays, docDate]);

  /** Inicializa líneas por modo cuando el usuario cambia modo o abre con datos por defecto. */
  useEffect(() => {
    if (!open || initialDraft) {
      return;
    }
    if (paymentMode === "COMPLETED") {
      setScheduledLines([]);
      setPaidLines((prev) => {
        if (prev.length > 0 && manualPaidLockRef.current) {
          return prev;
        }
        return [
          newImmediateLineFromTemplate({
            dueDate: docDate || toYyyyMmDdLocal(new Date()),
            amountStr: String(total),
            companyHasBanks,
            supplierHasBanks,
            companyBankAccounts,
            supplierBankAccounts,
            cashHubOptions,
          }),
        ];
      });
      manualPaidLockRef.current = false;
      return;
    }
    if (paymentMode === "PENDING") {
      setPaidLines([]);
      setScheduledLines([]);
      return;
    }
    if (paymentMode === "PENDING_SCHEDULED") {
      setPaidLines([]);
      setScheduledLines((prev) => {
        if (manualSchedLockRef.current) {
          return prev;
        }
        if (total <= 0) {
          return [];
        }
        if (prev.length > 0) {
          return applyEqualAmounts(prev, total);
        }
        return [
          newScheduledLineFromTemplate({
            dueDate: firstDueScheduled,
            amountStr: String(total),
          }),
        ];
      });
      return;
    }
    if (paymentMode === "PARTIAL") {
      const p = Math.max(0, partialAmount);
      const rest = Math.max(0, total - p);
      setPaidLines((prev) => {
        if (manualPaidLockRef.current) {
          return prev;
        }
        if (p <= 0) {
          return [];
        }
        if (prev.length > 0) {
          return applyEqualAmounts(prev, p);
        }
        return [
          newImmediateLineFromTemplate({
            dueDate: docDate || toYyyyMmDdLocal(new Date()),
            amountStr: String(p),
            companyHasBanks,
            supplierHasBanks,
            companyBankAccounts,
            supplierBankAccounts,
            cashHubOptions,
          }),
        ];
      });
      setScheduledLines((prev) => {
        if (manualSchedLockRef.current) {
          return prev;
        }
        if (rest <= 0) {
          return [];
        }
        if (prev.length > 0) {
          return applyEqualAmounts(prev, rest);
        }
        return [
          newScheduledLineFromTemplate({
            dueDate: firstDueScheduled,
            amountStr: String(rest),
          }),
        ];
      });
    }
  }, [
    open,
    initialDraft,
    paymentMode,
    total,
    partialAmount,
    docDate,
    firstDueScheduled,
    companyHasBanks,
    supplierHasBanks,
    companyBankAccounts,
    supplierBankAccounts,
    cashHubOptions,
  ]);

  const redistributeScheduledEqual = useCallback(() => {
    if (scheduleTotal <= 0) {
      setLocalError("No hay saldo a distribuir.");
      return;
    }
    setScheduledLines((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      manualSchedLockRef.current = false;
      return applyEqualAmounts(prev, scheduleTotal);
    });
    setLocalError(null);
  }, [scheduleTotal]);

  const scheduledSum = useMemo(
    () => scheduledLines.reduce((s, l) => s + parseClpAmountInput(l.amountStr), 0),
    [scheduledLines],
  );

  const scheduleAmountError = useMemo(() => {
    const needsSchedule =
      (paymentMode === "PENDING_SCHEDULED" && total > 0) ||
      (paymentMode === "PARTIAL" && scheduleTotal > 0);
    if (!needsSchedule || scheduledLines.length === 0) {
      return null;
    }
    if (Math.abs(scheduledSum - scheduleTotal) <= 1) {
      return null;
    }
    if (scheduledSum > scheduleTotal + 1) {
      return `Las cuotas suman ${formatMoney(scheduledSum)}, superior al saldo a pagar (${formatMoney(scheduleTotal)}).`;
    }
    return `Las cuotas suman ${formatMoney(scheduledSum)}; deben igualar el saldo (${formatMoney(scheduleTotal)}).`;
  }, [paymentMode, total, scheduleTotal, scheduledLines.length, scheduledSum]);

  const displayError = localError ?? scheduleAmountError;

  const validateAndApply = () => {
    setLocalError(null);
    if (!supplier?.id) {
      setLocalError("Seleccione un proveedor.");
      return;
    }
    if (paymentMode === "PENDING") {
      onApply({ mode: "PENDING", paidLines: [], scheduledLines: [] });
      onClose();
      return;
    }
    const checkCash = (lines: InvoicePlannedPaymentLineState[], label: string) => {
      for (const l of lines) {
        if (l.paymentMethod === "CASH") {
          if (isPosCash) {
            continue;
          }
          if (!cashHubOptions.length) {
            setLocalError(`No hay centros de acopio configurados (${label}).`);
            return false;
          }
          if (!l.cashHubId?.trim()) {
            setLocalError(`Seleccione centro de acopio para pago en efectivo (${label}).`);
            return false;
          }
        }
        if (l.paymentMethod === "TRANSFER") {
          if (!l.companyBankAccountKey || !l.supplierBankAccountKey) {
            setLocalError(`Complete cuentas para transferencia (${label}).`);
            return false;
          }
        }
        if (l.paymentMethod === "CHECK") {
          if (!l.companyBankAccountKey || !String(l.chequeNumber).trim()) {
            setLocalError(`Complete cuenta empresa y número de cheque (${label}).`);
            return false;
          }
        }
      }
      return true;
    };

    if (paymentMode === "COMPLETED") {
      if (paidLines.length === 0) {
        setLocalError("Defina la línea de pago.");
        return;
      }
      const sum = paidLines.reduce((s, l) => s + parseClpAmountInput(l.amountStr), 0);
      if (Math.abs(sum - total) > 1) {
        setLocalError(`La suma de pagos (${formatMoney(sum)}) debe igualar el total (${formatMoney(total)}).`);
        return;
      }
      if (!checkCash(paidLines, "pago único")) {
        return;
      }
      onApply({
        mode: "COMPLETED",
        paidLines: paidLines.map((l) => immediateLineToPayload(l, isPosCash)),
        scheduledLines: [],
      });
      onClose();
      return;
    }

    if (paymentMode === "PENDING_SCHEDULED") {
      if (scheduledLines.length === 0) {
        setLocalError("Agregue al menos una cuota.");
        return;
      }
      if (scheduleAmountError) {
        setLocalError(scheduleAmountError);
        return;
      }
      onApply({
        mode: "PENDING_SCHEDULED",
        paidLines: [],
        scheduledLines: scheduledLines.map(scheduledLineToPayload),
      });
      onClose();
      return;
    }

    if (paymentMode === "PARTIAL") {
      const p = partialAmount;
      if (p <= 0 || p >= total) {
        setLocalError("Indique un monto parcial mayor que 0 y menor que el total.");
        return;
      }
      if (paidLines.length === 0) {
        setLocalError("Defina el abono ya pagado.");
        return;
      }
      const paidSum = paidLines.reduce((s, l) => s + parseClpAmountInput(l.amountStr), 0);
      if (Math.abs(paidSum - p) > 1) {
        setLocalError("La suma del abono debe coincidir con el monto parcial indicado.");
        return;
      }
      const rest = total - p;
      if (rest > 0 && scheduledLines.length === 0) {
        setLocalError("Agregue al menos una cuota para el saldo restante.");
        return;
      }
      if (rest > 0 && scheduleAmountError) {
        setLocalError(scheduleAmountError);
        return;
      }
      if (!checkCash(paidLines, "abono")) {
        return;
      }
      onApply({
        mode: "PARTIAL",
        partialPaidAmount: p,
        paidLines: paidLines.map((l) => immediateLineToPayload(l, isPosCash)),
        scheduledLines: scheduledLines.map(scheduledLineToPayload),
      });
      onClose();
      return;
    }
  };

  const disabledInner = referenceLoading || !supplier?.id;

  const patchPaid = useCallback(
    (id: string, patch: Partial<InvoicePlannedPaymentLineState>) => {
      if (patch.amountStr !== undefined) {
        manualPaidLockRef.current = true;
      }
      setPaidLines((prev) =>
        prev.map((l) => {
          if (l.id !== id) {
            return l;
          }
          let next = { ...l, ...patch };
          if (next.paymentMethod === "TRANSFER") {
            if (companyBankAccounts[0] && !next.companyBankAccountKey) {
              next.companyBankAccountKey = bankAccountOptionKey(companyBankAccounts[0], 0);
            }
            const sb = supplierBankAccounts[0];
            if (sb && !next.supplierBankAccountKey) {
              next.supplierBankAccountKey = bankAccountOptionKey(sb, 0);
            }
            next.cashHubId = null;
          }
          if (next.paymentMethod === "CHECK") {
            next.cashHubId = null;
          }
          if (next.paymentMethod === "CASH") {
            const h = cashHubOptions[0];
            if (h && !next.cashHubId) {
              next.cashHubId = String(h.id);
            }
          }
          return next;
        }),
      );
    },
    [companyBankAccounts, supplierBankAccounts, cashHubOptions],
  );

  const patchSched = useCallback((id: string, patch: Partial<InvoicePlannedPaymentLineState>) => {
    if (patch.amountStr !== undefined) {
      manualSchedLockRef.current = true;
    }
    setScheduledLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );
  }, []);

  const addSched = useCallback(() => {
    manualSchedLockRef.current = false;
    setScheduledLines((prev) => {
      if (prev.length === 0) {
        return [
          newScheduledLineFromTemplate({
            dueDate: firstDueScheduled,
            amountStr: String(scheduleTotal),
          }),
        ];
      }
      const term = supplier?.defaultPaymentTermDays ?? 0;
      const lastDue = parseYyyyMmDdLocal(prev[prev.length - 1].dueDate);
      const nextDue = addCalendarDays(lastDue, term);
      const nextLine = newScheduledLineFromTemplate({
        dueDate: toYyyyMmDdLocal(nextDue),
        amountStr: "0",
      });
      return applyEqualAmounts(prev.concat([nextLine]), scheduleTotal);
    });
    setLocalError(null);
  }, [scheduleTotal, firstDueScheduled, supplier?.defaultPaymentTermDays]);

  const removeSched = useCallback(
    (id: string) => {
      manualSchedLockRef.current = false;
      setScheduledLines((prev) => {
        if (prev.length <= 1) {
          return prev;
        }
        const next = prev.filter((l) => l.id !== id);
        return applyEqualAmounts(next, scheduleTotal);
      });
      setLocalError(null);
    },
    [scheduleTotal],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Pago del documento (factura / boleta)"
      size="xl"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="purchase-doc-reception-payment-dialog"
      alertArea={
        <Alert variant="info" data-test-id="purchase-doc-reception-payment-info">
          Defina aquí el estado de pago del documento tributario. Al guardar la recepción se creará la factura o
          boleta de proveedor con este plan (cuando el tipo de documento sea factura o boleta).
        </Alert>
      }
      actions={
        <div className="flex w-full flex-wrap justify-end gap-2">
          <Button variant="secondary" size="md" type="button" onClick={onClose} data-test-id="purchase-doc-reception-payment-cancel">
            Cancelar
          </Button>
          <Button variant="primary" size="md" type="button" onClick={validateAndApply} data-test-id="purchase-doc-reception-payment-apply">
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

        <Select
          label="Estado de pago del documento"
          name="purchase-doc-reception-payment-mode"
          options={MODE_OPTIONS}
          value={paymentMode}
          onChange={(id) => {
            manualPaidLockRef.current = false;
            manualSchedLockRef.current = false;
            setPaymentMode((id ?? "PENDING") as ReceptionDocumentPaymentMode);
          }}
          disabled={disabledInner}
          data-test-id="purchase-doc-reception-payment-mode"
        />

        {displayError ? (
          <Alert variant="error" data-test-id="purchase-doc-reception-payment-error">
            {displayError}
          </Alert>
        ) : null}

        {paymentMode === "PARTIAL" ? (
          <TextField
            label="Monto ya pagado (CLP)"
            name="purchase-doc-reception-partial"
            type="currency"
            currencySymbol="$"
            startSymbol="$"
            value={partialAmountStr}
            onChange={(e) => {
              manualPaidLockRef.current = false;
              manualSchedLockRef.current = false;
              setPartialAmountStr(e.target.value);
            }}
            disabled={disabledInner}
          />
        ) : null}

        {(paymentMode === "PARTIAL" || paymentMode === "PENDING_SCHEDULED") && scheduleTotal > 0 ? (
          <div className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Saldo en cuotas:</span>{" "}
            <span className="tabular-nums">{formatMoney(scheduleTotal)}</span>
          </div>
        ) : null}

        {!supplier?.id ? (
          <p className="text-sm text-muted-foreground">Seleccione un proveedor en el encabezado.</p>
        ) : null}

        {paymentMode === "COMPLETED" && supplier?.id ? (
          <InvoicePlannedPaymentLines
            disabled={disabledInner}
            companyBankAccounts={companyBankAccounts}
            supplierBankAccounts={supplierBankAccounts}
            cashHubOptions={cashHubOptions}
            allowAddLine={false}
            lines={paidLines}
            onAddLine={() => {}}
            onRemoveLine={() => {}}
            onPatchLine={patchPaid}
          />
        ) : null}

        {paymentMode === "PARTIAL" && supplier?.id ? (
          <>
            <p className="text-xs font-medium text-foreground">Abono ya realizado</p>
            <InvoicePlannedPaymentLines
              disabled={disabledInner}
              companyBankAccounts={companyBankAccounts}
              supplierBankAccounts={supplierBankAccounts}
              cashHubOptions={cashHubOptions}
              lines={paidLines}
              onAddLine={() => {}}
              onRemoveLine={() => {}}
              onPatchLine={patchPaid}
            />
            {scheduleTotal > 0 ? (
              <>
                <p className="text-xs font-medium text-foreground">Saldo — cuotas programadas</p>
                <InvoicePlannedPaymentLines
                  disabled={disabledInner}
                  lineKind="scheduled"
                  companyBankAccounts={companyBankAccounts}
                  supplierBankAccounts={supplierBankAccounts}
                  cashHubOptions={cashHubOptions}
                  lines={scheduledLines}
                  onAddLine={addSched}
                  onRemoveLine={removeSched}
                  onPatchLine={patchSched}
                  onDistributeEqual={
                    scheduledLines.length > 0 ? redistributeScheduledEqual : undefined
                  }
                />
              </>
            ) : null}
          </>
        ) : null}

        {paymentMode === "PENDING_SCHEDULED" && supplier?.id && total > 0 ? (
          <InvoicePlannedPaymentLines
            disabled={disabledInner}
            lineKind="scheduled"
            companyBankAccounts={companyBankAccounts}
            supplierBankAccounts={supplierBankAccounts}
            cashHubOptions={cashHubOptions}
            lines={scheduledLines}
            onAddLine={addSched}
            onRemoveLine={removeSched}
            onPatchLine={patchSched}
            onDistributeEqual={
              scheduledLines.length > 0 ? redistributeScheduledEqual : undefined
            }
          />
        ) : null}
      </div>
    </Dialog>
  );
}
