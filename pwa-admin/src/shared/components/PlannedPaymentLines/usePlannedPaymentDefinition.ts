"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Option } from "@kai/ui";
import type { CompanyBankAccountItem } from "@/features/settings-branches/infrastructure/company.request";
import type { PayeeBankAccount } from "@/shared/lib/planned-payment-plan";
import { parseClpAmountInput, splitTotalAcrossLines } from "@/features/purchasing-dte/lib/planned-payment-helpers";
import { toYyyyMmDdLocal } from "@/features/purchasing-dte/lib/planned-payment-helpers";
import {
  applyEqualPaymentAmounts,
  newImmediatePaymentLine,
  newScheduledPaymentLine,
} from "@/shared/lib/planned-payment-plan";
import type { InvoicePlannedPaymentLineState } from "./InvoicePlannedPaymentLines";
import type { PlannedPaymentMode } from "./planned-payment-mode.types";
import {
  resolveFirstScheduledDueDate,
  resolveNextScheduledDueDate,
  type PlannedPaymentScheduleConfig,
} from "./planned-payment-definition.schedule";

function plannedPaymentLinesEqual(
  a: InvoicePlannedPaymentLineState[],
  b: InvoicePlannedPaymentLineState[],
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i]!;
    const y = b[i]!;
    if (
      x.id !== y.id ||
      x.dueDate !== y.dueDate ||
      x.amountStr !== y.amountStr ||
      x.paymentMethod !== y.paymentMethod ||
      x.companyBankAccountKey !== y.companyBankAccountKey ||
      x.supplierBankAccountKey !== y.supplierBankAccountKey ||
      x.chequeNumber !== y.chequeNumber ||
      (x.cashHubId ?? null) !== (y.cashHubId ?? null) ||
      (x.cashSessionId ?? null) !== (y.cashSessionId ?? null)
    ) {
      return false;
    }
  }
  return true;
}

export type PlannedPaymentScheduledLinesBehavior = "term-chain" | "equal-split";

export type PlannedPaymentDefinitionControlledState = {
  paymentMode: PlannedPaymentMode;
  onPaymentModeChange: (mode: PlannedPaymentMode) => void;
  partialAmountStr: string;
  onPartialAmountStrChange: (value: string) => void;
  paidLines: InvoicePlannedPaymentLineState[];
  onPaidLinesChange: (lines: InvoicePlannedPaymentLineState[]) => void;
  scheduledLines: InvoicePlannedPaymentLineState[];
  onScheduledLinesChange: (lines: InvoicePlannedPaymentLineState[]) => void;
};

export type UsePlannedPaymentDefinitionArgs = {
  total: number;
  payeeSelected: boolean;
  disabled?: boolean;
  /** Fecha del pago inmediato (documento / liquidación). */
  immediatePaymentDate: string;
  schedule: PlannedPaymentScheduleConfig;
  scheduledLinesBehavior: PlannedPaymentScheduledLinesBehavior;
  companyBankAccounts: CompanyBankAccountItem[];
  payeeBankAccounts: PayeeBankAccount[];
  cashHubOptions?: Option[];
  /** Estado elevado al padre (p. ej. liquidación de sueldo). */
  controlled?: PlannedPaymentDefinitionControlledState;
  /** Pausar sincronización automática (diálogo con borrador). */
  syncPaused?: boolean;
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function usePlannedPaymentDefinition(args: UsePlannedPaymentDefinitionArgs) {
  const {
    total: rawTotal,
    payeeSelected,
    disabled = false,
    immediatePaymentDate,
    schedule,
    scheduledLinesBehavior,
    companyBankAccounts,
    payeeBankAccounts,
    cashHubOptions = [],
    controlled,
    syncPaused = false,
  } = args;

  const [internalMode, setInternalMode] = useState<PlannedPaymentMode>("PENDING");
  const [internalPartialStr, setInternalPartialStr] = useState("0");
  const [internalPaid, setInternalPaid] = useState<InvoicePlannedPaymentLineState[]>([]);
  const [internalSched, setInternalSched] = useState<InvoicePlannedPaymentLineState[]>([]);

  const paymentMode = controlled?.paymentMode ?? internalMode;
  const partialAmountStr = controlled?.partialAmountStr ?? internalPartialStr;
  const paidLines = controlled?.paidLines ?? internalPaid;
  const scheduledLines = controlled?.scheduledLines ?? internalSched;

  const manualPaidLockRef = useRef(false);
  const manualSchedLockRef = useRef(false);
  const controlledRef = useRef(controlled);
  controlledRef.current = controlled;
  const companyBankAccountsRef = useRef(companyBankAccounts);
  companyBankAccountsRef.current = companyBankAccounts;
  const payeeBankAccountsRef = useRef(payeeBankAccounts);
  payeeBankAccountsRef.current = payeeBankAccounts;
  const cashHubOptionsRef = useRef(cashHubOptions);
  cashHubOptionsRef.current = cashHubOptions;

  const setPaymentMode = useCallback((mode: PlannedPaymentMode) => {
    const c = controlledRef.current;
    if (c?.onPaymentModeChange) {
      if (c.paymentMode === mode) return;
      c.onPaymentModeChange(mode);
    } else {
      setInternalMode(mode);
    }
  }, []);

  const setPartialAmountStr = useCallback((value: string) => {
    const c = controlledRef.current;
    if (c?.onPartialAmountStrChange) {
      if (c.partialAmountStr === value) return;
      c.onPartialAmountStrChange(value);
    } else {
      setInternalPartialStr(value);
    }
  }, []);

  const setPaidLines = useCallback(
    (
      value:
        | InvoicePlannedPaymentLineState[]
        | ((prev: InvoicePlannedPaymentLineState[]) => InvoicePlannedPaymentLineState[]),
    ) => {
      const c = controlledRef.current;
      if (c?.onPaidLinesChange) {
        const next = typeof value === "function" ? value(c.paidLines) : value;
        if (plannedPaymentLinesEqual(next, c.paidLines)) return;
        c.onPaidLinesChange(next);
      } else {
        setInternalPaid(value);
      }
    },
    [],
  );

  const setScheduledLines = useCallback(
    (
      value:
        | InvoicePlannedPaymentLineState[]
        | ((prev: InvoicePlannedPaymentLineState[]) => InvoicePlannedPaymentLineState[]),
    ) => {
      const c = controlledRef.current;
      if (c?.onScheduledLinesChange) {
        const next = typeof value === "function" ? value(c.scheduledLines) : value;
        if (plannedPaymentLinesEqual(next, c.scheduledLines)) return;
        c.onScheduledLinesChange(next);
      } else {
        setInternalSched(value);
      }
    },
    [],
  );

  const total = Math.max(0, Math.round(rawTotal || 0));
  const partialAmount = paymentMode === "PARTIAL" ? parseClpAmountInput(partialAmountStr) : 0;
  const partialAmountDefined =
    paymentMode === "PARTIAL" && partialAmount > 0 && partialAmount < total;
  const scheduleTotal =
    paymentMode === "PARTIAL"
      ? partialAmountDefined
        ? total - partialAmount
        : 0
      : paymentMode === "PENDING_SCHEDULED"
        ? total
        : 0;

  const companyHasBanks = companyBankAccounts.length > 0;
  const payeeHasBanks = payeeBankAccounts.length > 0;
  const firstDueScheduled = useMemo(
    () => resolveFirstScheduledDueDate(schedule),
    [schedule],
  );
  const paymentDate =
    immediatePaymentDate?.trim() || toYyyyMmDdLocal(new Date());

  useEffect(() => {
    manualPaidLockRef.current = false;
    manualSchedLockRef.current = false;
  }, [paymentMode, payeeSelected]);

  useEffect(() => {
    if (syncPaused || !payeeSelected || total <= 0) {
      return;
    }
    const banks = companyBankAccountsRef.current;
    const payeeBanks = payeeBankAccountsRef.current;
    const hubs = cashHubOptionsRef.current;

    if (paymentMode === "COMPLETED") {
      setScheduledLines((prev) => (prev.length === 0 ? prev : []));
      if (!manualPaidLockRef.current) {
        setPaidLines((prev) => {
          if (manualPaidLockRef.current) return prev;
          const amountStr = String(total);
          if (prev.length === 1 && prev[0]?.amountStr === amountStr) {
            return prev;
          }
          if (prev.length > 0) {
            return prev.map((line, index) =>
              index === 0 ? { ...line, amountStr } : line,
            );
          }
          return [
            newImmediatePaymentLine({
              dueDate: paymentDate,
              amountStr,
              companyHasBanks,
              payeeHasBanks,
              companyBankAccounts: banks,
              payeeBankAccounts: payeeBanks,
              cashHubOptions: hubs,
            }),
          ];
        });
      }
      return;
    }
    if (paymentMode === "PENDING") {
      setPaidLines((prev) => (prev.length === 0 ? prev : []));
      setScheduledLines((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    if (paymentMode === "PENDING_SCHEDULED") {
      setPaidLines((prev) => (prev.length === 0 ? prev : []));
      if (!manualSchedLockRef.current) {
        setScheduledLines((prev) => {
          if (manualSchedLockRef.current) return prev;
          if (prev.length > 0) {
            const next = applyEqualPaymentAmounts(prev, total);
            return plannedPaymentLinesEqual(prev, next) ? prev : next;
          }
          return [
            newScheduledPaymentLine({
              dueDate: firstDueScheduled,
              amountStr: String(total),
            }),
          ];
        });
      }
      return;
    }
    if (paymentMode === "PARTIAL") {
      setPaidLines((prev) => (prev.length === 0 ? prev : []));
      if (!manualSchedLockRef.current) {
        if (!partialAmountDefined) {
          setScheduledLines((prev) => (prev.length === 0 ? prev : []));
        } else {
          const scheduleAmountStr = String(total - partialAmount);
          setScheduledLines((prev) => {
            if (manualSchedLockRef.current) return prev;
            if (
              prev.length === 1 &&
              prev[0]?.amountStr === scheduleAmountStr &&
              prev[0]?.dueDate === firstDueScheduled
            ) {
              return prev;
            }
            return [
              newScheduledPaymentLine({
                dueDate: firstDueScheduled,
                amountStr: scheduleAmountStr,
              }),
            ];
          });
        }
      }
    }
  }, [
    syncPaused,
    payeeSelected,
    paymentMode,
    total,
    partialAmount,
    partialAmountDefined,
    paymentDate,
    firstDueScheduled,
    companyHasBanks,
    payeeHasBanks,
    companyBankAccounts.length,
    payeeBankAccounts.length,
    cashHubOptions.length,
    setPaidLines,
    setScheduledLines,
  ]);

  const scheduledSum = useMemo(
    () => scheduledLines.reduce((s, l) => s + parseClpAmountInput(l.amountStr), 0),
    [scheduledLines],
  );

  const scheduleAmountError = useMemo(() => {
    const needsSchedule =
      (paymentMode === "PENDING_SCHEDULED" && total > 0) ||
      (paymentMode === "PARTIAL" && partialAmountDefined && scheduleTotal > 0);
    if (!needsSchedule || scheduledLines.length === 0) {
      return null;
    }
    if (Math.abs(scheduledSum - scheduleTotal) <= 1) {
      return null;
    }
    if (scheduledSum > scheduleTotal + 1) {
      return `Las cuotas suman ${formatMoney(scheduledSum)}, superior al saldo (${formatMoney(scheduleTotal)}).`;
    }
    return `Las cuotas suman ${formatMoney(scheduledSum)}; deben igualar el saldo (${formatMoney(scheduleTotal)}).`;
  }, [
    paymentMode,
    total,
    partialAmountDefined,
    scheduleTotal,
    scheduledLines.length,
    scheduledSum,
  ]);

  const patchPaid = useCallback(
    (id: string, patch: Partial<InvoicePlannedPaymentLineState>) => {
      if (patch.amountStr !== undefined) {
        manualPaidLockRef.current = true;
      }
      setPaidLines(paidLines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    },
    [paidLines, setPaidLines],
  );

  const patchSched = useCallback(
    (id: string, patch: Partial<InvoicePlannedPaymentLineState>) => {
      if (patch.amountStr !== undefined) {
        manualSchedLockRef.current = true;
      }
      setScheduledLines(scheduledLines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    },
    [scheduledLines, setScheduledLines],
  );

  const onPartialAmountChange = useCallback(
    (value: string) => {
      manualPaidLockRef.current = false;
      manualSchedLockRef.current = false;
      setPartialAmountStr(value);
    },
    [setPartialAmountStr],
  );

  const redistributeScheduledEqual = useCallback(() => {
    if (scheduleTotal <= 0) {
      return;
    }
    manualSchedLockRef.current = false;
    if (scheduledLinesBehavior === "equal-split") {
      const parts = splitTotalAcrossLines(scheduleTotal, scheduledLines.length);
      setScheduledLines(
        scheduledLines.map((l, i) => ({ ...l, amountStr: String(parts[i] ?? 0) })),
      );
      return;
    }
    setScheduledLines((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      return applyEqualPaymentAmounts(prev, scheduleTotal);
    });
  }, [scheduleTotal, scheduledLines, scheduledLinesBehavior, setScheduledLines]);

  const addScheduledLine = useCallback(() => {
    manualSchedLockRef.current = false;
    const lastDue =
      scheduledLines[scheduledLines.length - 1]?.dueDate ?? firstDueScheduled;
    const nextDue = resolveNextScheduledDueDate(schedule, lastDue);
    const nextLine = newScheduledPaymentLine({ dueDate: nextDue, amountStr: "0" });

    if (scheduledLinesBehavior === "equal-split") {
      const next = [...scheduledLines, nextLine];
      const parts = splitTotalAcrossLines(scheduleTotal, next.length);
      setScheduledLines(next.map((l, i) => ({ ...l, amountStr: String(parts[i] ?? 0) })));
      return;
    }
    setScheduledLines((prev) => prev.concat([nextLine]));
  }, [
    scheduledLines,
    firstDueScheduled,
    schedule,
    scheduledLinesBehavior,
    scheduleTotal,
    setScheduledLines,
  ]);

  const removeScheduledLine = useCallback(
    (id: string) => {
      manualSchedLockRef.current = false;
      const next = scheduledLines.filter((l) => l.id !== id);
      if (next.length === 0) {
        return;
      }
      if (scheduledLinesBehavior === "equal-split") {
        const parts = splitTotalAcrossLines(scheduleTotal, next.length);
        setScheduledLines(next.map((l, i) => ({ ...l, amountStr: String(parts[i] ?? 0) })));
        return;
      }
      setScheduledLines(applyEqualPaymentAmounts(next, scheduleTotal));
    },
    [scheduledLines, scheduleTotal, scheduledLinesBehavior, setScheduledLines],
  );

  const disabledInner = disabled || !payeeSelected || total <= 0;

  const showCompletedLines = paymentMode === "COMPLETED" && payeeSelected && total > 0;
  const showScheduledLines =
    payeeSelected &&
    total > 0 &&
    ((paymentMode === "PENDING_SCHEDULED") ||
      (paymentMode === "PARTIAL" && partialAmountDefined && scheduleTotal > 0));

  return {
    paymentMode,
    setPaymentMode,
    partialAmountStr,
    onPartialAmountChange,
    partialAmount,
    partialAmountDefined,
    scheduleTotal,
    scheduleAmountError,
    paidLines,
    scheduledLines,
    patchPaid,
    patchSched,
    addScheduledLine,
    removeScheduledLine,
    redistributeScheduledEqual,
    disabledInner,
    showCompletedLines,
    showScheduledLines,
    companyBankAccounts,
    payeeBankAccounts,
    cashHubOptions,
  };
}

export type PlannedPaymentDefinitionViewModel = ReturnType<typeof usePlannedPaymentDefinition>;
