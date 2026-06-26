"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Dialog, Select, TextField } from "@/shared/admin-shared";
import type { Option } from "@/shared/components/Select";
import { getCustomerPosDetailBundleAction } from "@/features/customers/actions/customers-pos.action";
import type { PosCustomerDetail } from "@/features/customers/types/pos-customer-detail.types";
import type { PosPaymentLine } from "@/features/pos-cart/pos-payment.types";
import { makePaymentLineId } from "@/features/pos-cart/pos-payment.utils";
import type { PosInternalCreditMode } from "@/features/pos-payment/lib/internal-credit-plan.types";
import {
  buildDefaultScheduledLines,
  computeNetAvailableCredit,
  resolveCreditAmountForMode,
  scheduledLinesSum,
  suggestFirstDueDate,
  validateInternalCreditPlan,
} from "@/features/pos-payment/lib/internal-credit-plan";
import { parseClpAmountInput } from "@/features/purchasing-reception/lib/planned-payment-helpers";
import {
  InvoicePlannedPaymentLines,
  type InvoicePlannedPaymentLineState,
} from "@/shared/components/PlannedPaymentLines/InvoicePlannedPaymentLines";

const MODE_OPTIONS: Option[] = [
  { id: "CREDIT_LUMP", label: "Crédito total (sin cuotas)" },
  { id: "CREDIT_SCHEDULED", label: "Crédito con cuotas programadas" },
  { id: "PARTIAL_WITH_SCHEDULE", label: "Abono hoy + saldo en cuotas" },
];

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function scheduledToUiLines(
  lines: Array<{ installmentNumber: number; dueDate: string; amount: number }>,
): InvoicePlannedPaymentLineState[] {
  return lines.map((line) => ({
    id: `sched-${line.installmentNumber}`,
    dueDate: line.dueDate,
    amountStr: String(Math.round(line.amount)),
    companyBankAccountKey: null,
    supplierBankAccountKey: null,
    chequeNumber: "",
  }));
}

function uiLinesToScheduled(lines: InvoicePlannedPaymentLineState[]) {
  return lines.map((line, index) => ({
    installmentNumber: index + 1,
    dueDate: line.dueDate,
    amount: parseClpAmountInput(line.amountStr),
  }));
}

type Props = {
  open: boolean;
  onClose: () => void;
  customerId: string;
  customerDisplayName: string;
  saleRemaining: number;
  paymentMethodId: string;
  paymentMethodLabel: string;
  existingPayments: PosPaymentLine[];
  editingLineId?: string | null;
  initial?: PosPaymentLine | null;
  onConfirm: (line: PosPaymentLine) => void;
};

export function PosInternalCreditPaymentDialog({
  open,
  onClose,
  customerId,
  customerDisplayName,
  saleRemaining,
  paymentMethodId,
  paymentMethodLabel,
  existingPayments,
  editingLineId,
  initial,
  onConfirm,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<PosCustomerDetail | null>(null);
  const [mode, setMode] = useState<PosInternalCreditMode>("CREDIT_LUMP");
  const [creditAmountStr, setCreditAmountStr] = useState("");
  const [immediateAmountStr, setImmediateAmountStr] = useState("");
  const [installmentCountStr, setInstallmentCountStr] = useState("3");
  const [firstDueDate, setFirstDueDate] = useState("");
  const [scheduledLines, setScheduledLines] = useState<InvoicePlannedPaymentLineState[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  const netAvailable = useMemo(
    () =>
      computeNetAvailableCredit(
        customer?.availableCredit ?? 0,
        existingPayments,
        editingLineId,
      ),
    [customer?.availableCredit, existingPayments, editingLineId],
  );

  const creditAmount = useMemo(() => {
    const explicit = parseClpAmountInput(creditAmountStr);
    return resolveCreditAmountForMode(
      mode,
      saleRemaining,
      netAvailable,
      parseClpAmountInput(immediateAmountStr),
      mode === "PARTIAL_WITH_SCHEDULE" ? undefined : explicit,
    );
  }, [mode, saleRemaining, netAvailable, immediateAmountStr, creditAmountStr]);

  const availableAfter = Math.max(0, netAvailable - creditAmount);

  const hydrateFromInitial = useCallback(
    (detail: PosCustomerDetail | null) => {
      const plan = initial?.internalCreditPlan;
      const defaultCredit = resolveCreditAmountForMode(
        "CREDIT_LUMP",
        saleRemaining,
        computeNetAvailableCredit(detail?.availableCredit ?? 0, existingPayments, editingLineId),
      );
      if (plan) {
        setMode(plan.mode);
        setCreditAmountStr(String(plan.creditAmount));
        setImmediateAmountStr(
          plan.immediateAmount != null ? String(plan.immediateAmount) : "",
        );
        const lines = plan.scheduledLines ?? [];
        if (lines.length > 0) {
          setInstallmentCountStr(String(lines.length));
          setFirstDueDate(lines[0].dueDate);
          setScheduledLines(scheduledToUiLines(lines));
        }
      } else {
        setMode("CREDIT_LUMP");
        setCreditAmountStr(String(defaultCredit));
        setImmediateAmountStr("");
        const suggested = suggestFirstDueDate(detail?.paymentDayOfMonth);
        setFirstDueDate(suggested);
        setInstallmentCountStr("3");
        setScheduledLines(
          scheduledToUiLines(buildDefaultScheduledLines(defaultCredit, 3, suggested)),
        );
      }
      setLocalError(null);
    },
    [initial, saleRemaining, existingPayments, editingLineId],
  );

  useEffect(() => {
    if (!open) {
      hydratedRef.current = false;
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void getCustomerPosDetailBundleAction(customerId).then((res) => {
      if (cancelled) return;
      if (!res.success) {
        setLoadError(res.message);
        setCustomer(null);
        setLoading(false);
        return;
      }
      setCustomer(res.customer);
      hydrateFromInitial(res.customer);
      hydratedRef.current = true;
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, customerId, hydrateFromInitial]);

  const regenerateSchedule = useCallback(
    (count: number, due: string, amount: number) => {
      const c = Math.max(1, Math.min(36, Math.trunc(count) || 1));
      setScheduledLines(
        scheduledToUiLines(buildDefaultScheduledLines(amount, c, due || suggestFirstDueDate(customer?.paymentDayOfMonth))),
      );
    },
    [customer?.paymentDayOfMonth],
  );

  useEffect(() => {
    if (!open) {
      hydratedRef.current = false;
      return;
    }
    if (mode === "CREDIT_LUMP" || !hydratedRef.current) return;
    const count = Math.max(1, Math.trunc(Number(installmentCountStr) || 3));
    const due = firstDueDate || suggestFirstDueDate(customer?.paymentDayOfMonth);
    regenerateSchedule(count, due, creditAmount);
    // Solo al cambiar modo o parámetros de plantilla; no en cada variación de monto manual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, installmentCountStr, firstDueDate]);

  const patchSched = useCallback((id: string, patch: Partial<InvoicePlannedPaymentLineState>) => {
    setScheduledLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, []);

  const addSched = useCallback(() => {
    const due = firstDueDate || suggestFirstDueDate(customer?.paymentDayOfMonth);
    setScheduledLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        dueDate: due,
        amountStr: "0",
        companyBankAccountKey: null,
        supplierBankAccountKey: null,
        chequeNumber: "",
      },
    ]);
  }, [firstDueDate, customer?.paymentDayOfMonth]);

  const removeSched = useCallback((id: string) => {
    setScheduledLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const redistributeScheduledEqual = useCallback(() => {
    const amounts = buildDefaultScheduledLines(
      creditAmount,
      scheduledLines.length || 1,
      firstDueDate || suggestFirstDueDate(customer?.paymentDayOfMonth),
    );
    setScheduledLines((prev) =>
      prev.map((line, index) => ({
        ...line,
        amountStr: String(amounts[index]?.amount ?? 0),
      })),
    );
  }, [creditAmount, scheduledLines.length, firstDueDate, customer?.paymentDayOfMonth]);

  function handleConfirm() {
    setLocalError(null);
    const plan = {
      mode,
      creditAmount:
        mode === "PARTIAL_WITH_SCHEDULE"
          ? resolveCreditAmountForMode(
              mode,
              saleRemaining,
              netAvailable,
              parseClpAmountInput(immediateAmountStr),
            )
          : parseClpAmountInput(creditAmountStr) || creditAmount,
      scheduledLines:
        mode === "CREDIT_LUMP" ? [] : uiLinesToScheduled(scheduledLines),
      ...(mode === "PARTIAL_WITH_SCHEDULE"
        ? { immediateAmount: parseClpAmountInput(immediateAmountStr) }
        : {}),
    };

    const err = validateInternalCreditPlan(plan, netAvailable, saleRemaining);
    if (err) {
      setLocalError(err);
      return;
    }

    const line: PosPaymentLine = {
      id: initial?.id ?? makePaymentLineId(),
      type: "INTERNAL_CREDIT",
      amount: plan.creditAmount,
      reference: "",
      companyPaymentMethodId: paymentMethodId,
      internalCreditPlan: plan,
    };
    onConfirm(line);
    onClose();
  }

  const scheduleSum = scheduledLinesSum(uiLinesToScheduled(scheduledLines));
  const showSchedule = mode !== "CREDIT_LUMP";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={paymentMethodLabel || "Crédito interno"}
      size="md"
      scroll="paper"
      alertArea={
        loadError || localError ? (
          <Alert variant="error">{loadError ?? localError}</Alert>
        ) : null
      }
      actions={
        <>
          <Button type="button" variant="outlined" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleConfirm}
            disabled={loading || !!loadError}
            data-test-id="pos-internal-credit-confirm"
          >
            Agregar al cobro
          </Button>
        </>
      }
      data-test-id="pos-internal-credit-dialog"
    >
      <div className="grid gap-4 text-sm">
        <p className="text-muted-foreground">
          Cliente: <span className="font-medium text-foreground">{customerDisplayName}</span>
        </p>

        {loading ? (
          <p className="text-muted-foreground">Cargando saldo de crédito…</p>
        ) : customer ? (
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-xs">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div>
                <span className="text-muted-foreground">Límite</span>
                <p className="font-semibold tabular-nums">{formatMoney(customer.creditLimit)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Utilizado</span>
                <p className="font-semibold tabular-nums">{formatMoney(customer.usedCredit)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Disponible</span>
                <p className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatMoney(netAvailable)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Tras operación</span>
                <p className="font-semibold tabular-nums">{formatMoney(availableAfter)}</p>
              </div>
            </div>
            {customer.paymentDayOfMonth ? (
              <p className="mt-2 text-muted-foreground">
                Día de pago habitual: {customer.paymentDayOfMonth}
              </p>
            ) : null}
          </div>
        ) : null}

        <p className="text-muted-foreground">
          Saldo restante de la venta:{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatMoney(saleRemaining)}
          </span>
        </p>

        <Select
          label="Modo de crédito"
          name="pos-internal-credit-mode"
          options={MODE_OPTIONS}
          value={mode}
          onChange={(id) => setMode((id ?? "CREDIT_LUMP") as PosInternalCreditMode)}
          disabled={loading}
          data-test-id="pos-internal-credit-mode"
        />

        {mode === "PARTIAL_WITH_SCHEDULE" ? (
          <TextField
            label="Abono de hoy (otros medios)"
            name="pos-internal-credit-immediate"
            type="currency"
            currencySymbol="$"
            startSymbol="$"
            value={immediateAmountStr}
            onChange={(e) => setImmediateAmountStr(e.target.value)}
            disabled={loading}
            data-test-id="pos-internal-credit-immediate"
          />
        ) : null}

        {mode !== "PARTIAL_WITH_SCHEDULE" ? (
          <TextField
            label="Monto al crédito"
            name="pos-internal-credit-amount"
            type="currency"
            currencySymbol="$"
            startSymbol="$"
            value={creditAmountStr}
            onChange={(e) => setCreditAmountStr(e.target.value)}
            disabled={loading}
            data-test-id="pos-internal-credit-amount"
          />
        ) : (
          <div className="rounded-md border border-border px-3 py-2 text-xs">
            <span className="text-muted-foreground">Monto al crédito (saldo): </span>
            <span className="font-semibold tabular-nums">{formatMoney(creditAmount)}</span>
          </div>
        )}

        {showSchedule ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                label="Nº de cuotas"
                name="pos-internal-credit-count"
                type="number"
                min={1}
                max={36}
                value={installmentCountStr}
                onChange={(e) => setInstallmentCountStr(e.target.value)}
                disabled={loading}
              />
              <TextField
                label="Primer vencimiento"
                name="pos-internal-credit-first-due"
                type="date"
                value={firstDueDate}
                onChange={(e) => setFirstDueDate(e.target.value)}
                disabled={loading}
              />
            </div>
            {Math.abs(scheduleSum - creditAmount) > 1 ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Las cuotas suman {formatMoney(scheduleSum)}; deben igualar{" "}
                {formatMoney(creditAmount)}.
              </p>
            ) : null}
            <InvoicePlannedPaymentLines
              disabled={loading}
              lineKind="scheduled"
              companyBankAccounts={[]}
              supplierBankAccounts={[]}
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

        {mode === "PARTIAL_WITH_SCHEDULE" ? (
          <p className="text-xs text-muted-foreground">
            Después de agregar el crédito, use «Agregar método de pago» para registrar el abono de
            hoy con efectivo, tarjeta u otro medio (no crédito interno).
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
