"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Select, type Option } from "@kai/ui";
import { PlannedPaymentPlanSection } from "@/shared/components/PlannedPaymentLines";
import { createRemunerationAction, listPayrollSuggestionsFromJornadaAction, previewPayrollSettlementAction } from "@/features/hr-remunerations/actions/remuneration.action";
import type { EmployeeGridRow } from "@/features/hr-employees/types/employee.types";
import type { CompanyBankAccountItem } from "@/features/settings-branches/infrastructure/company.request";
import type { PersonBankAccountItem } from "@/features/person-bank-accounts/types/person-bank-account.types";
import type { CashHubRow } from "@/features/treasury-cash-hubs/types/cash-hub.types";
import { loadCompanyBankAccountsForPurchasingAction } from "@/features/purchasing-invoices/actions/company-banks.action";
import { listCashHubsForPurchasingAction } from "@/features/treasury-cash-hubs/actions/cash-hub.action";
import { listPersonBankAccountsAction } from "@/features/person-bank-accounts/actions/person-bank-account.action";
import {
  calculatePayrollSettlementTotals,
  draftLinesToPayload,
  newDraftLine,
  parsePayrollAmount,
  type PayrollSettlementDraftLine,
} from "@/features/hr-remunerations/lib/payroll-settlement-calc";
import { payrollLineCategory } from "@/features/hr-remunerations/lib/payroll-line-types";
import { buildPayrollSettlementPaymentPayload } from "@/features/hr-remunerations/lib/payroll-settlement-payment-payload";
import type { PayrollSettlementPaymentPayload } from "@/features/hr-remunerations/types/payroll-settlement-payment.types";
import { PayrollSettlementLinesEditor } from "./PayrollSettlementLinesEditor";

export type CreateRemunerationDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  employees: EmployeeGridRow[];
};

function employeeLabel(row: EmployeeGridRow): string {
  const p = row.person;
  if (p) {
    const business = p.businessName?.trim();
    if (business) return business;
    const full = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
    if (full) return full;
  }
  return row.id;
}

function todayIsoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function baseSalaryAsInputValue(baseSalary: string | null | undefined): string {
  if (baseSalary == null || String(baseSalary).trim() === "") {
    return "";
  }
  const n = parsePayrollAmount(String(baseSalary));
  return n > 0 ? String(n) : "";
}

function fmtClp(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function CreateRemunerationDialog({
  open,
  onClose,
  onSuccess,
  employees,
}: CreateRemunerationDialogProps) {
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [date, setDate] = useState(todayIsoDate);
  const [earningLines, setEarningLines] = useState<PayrollSettlementDraftLine[]>([]);
  const [deductionLines, setDeductionLines] = useState<PayrollSettlementDraftLine[]>([]);
  const [settlementPayment, setSettlementPayment] = useState<PayrollSettlementPaymentPayload>({
    mode: "PENDING",
    paidLines: [],
    scheduledLines: [],
  });
  const [paymentValid, setPaymentValid] = useState(true);
  const [companyBankAccounts, setCompanyBankAccounts] = useState<CompanyBankAccountItem[]>([]);
  const [cashHubs, setCashHubs] = useState<CashHubRow[]>([]);
  const [employeeBankAccounts, setEmployeeBankAccounts] = useState<PersonBankAccountItem[]>([]);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [employerCosts, setEmployerCosts] = useState<
    Array<{ code: string; label: string; amount: number; ratePercent: number }>
  >([]);
  const [employerTotal, setEmployerTotal] = useState(0);
  const [previewNote, setPreviewNote] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [paymentSyncKey, setPaymentSyncKey] = useState(0);
  const previewSeqRef = useRef(0);
  const skipEarningsPreviewRef = useRef(false);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === employeeId) ?? null,
    [employees, employeeId],
  );

  const employeeOptions: Option[] = useMemo(
    () =>
      employees
        .filter((e) => e.status !== "TERMINATED")
        .map((e) => ({ id: e.id, label: employeeLabel(e) })),
    [employees],
  );

  const totals = useMemo(
    () => calculatePayrollSettlementTotals([...earningLines, ...deductionLines]),
    [earningLines, deductionLines],
  );

  const cashHubOptions: Option[] = useMemo(
    () => cashHubs.map((h) => ({ id: h.id, label: h.name?.trim() || h.id })),
    [cashHubs],
  );

  const payeeBankAccounts = useMemo(
    () =>
      employeeBankAccounts.map((a) => ({
        accountKey: a.accountKey,
        bankName: a.bankName,
        accountType: a.accountType,
        accountNumber: a.accountNumber,
        accountHolderName: a.accountHolderName,
        accountHolderRut: a.accountHolderRut,
        isPrimary: a.isPrimary,
        notes: a.notes,
      })),
    [employeeBankAccounts],
  );

  const onPaymentStateChange = useCallback(
    (state: {
      payload: import("@/shared/lib/planned-payment-plan").PlannedPaymentPayload;
      valid: boolean;
      error: string | null;
    }) => {
      setSettlementPayment(buildPayrollSettlementPaymentPayload(state.payload));
      setPaymentValid(state.valid);
    },
    [],
  );

  const reset = useCallback(() => {
    setEmployeeId(null);
    setDate(todayIsoDate());
    setEarningLines([]);
    setDeductionLines([]);
    setSettlementPayment({ mode: "PENDING", paidLines: [], scheduledLines: [] });
    setPaymentValid(true);
    setEmployeeBankAccounts([]);
    setEmployerCosts([]);
    setEmployerTotal(0);
    setPreviewNote(null);
    setPreviewLoading(false);
    setPaymentSyncKey(0);
    previewSeqRef.current = 0;
    skipEarningsPreviewRef.current = false;
    setError(null);
  }, []);

  useEffect(() => {
    if (open) {
      reset();
      setReferenceLoading(true);
      void (async () => {
        try {
          const [banks, hubs] = await Promise.all([
            loadCompanyBankAccountsForPurchasingAction(),
            listCashHubsForPurchasingAction(),
          ]);
          setCompanyBankAccounts(banks);
          setCashHubs(hubs);
        } finally {
          setReferenceLoading(false);
        }
      })();
    }
  }, [open, reset]);

  useEffect(() => {
    const personId = selectedEmployee?.personId ?? selectedEmployee?.person?.id ?? "";
    if (!personId) {
      setEmployeeBankAccounts([]);
      return;
    }
    void (async () => {
      const res = await listPersonBankAccountsAction(personId);
      setEmployeeBankAccounts(res.success ? res.accounts : []);
    })();
  }, [selectedEmployee?.personId, selectedEmployee?.person?.id]);

  const applyPreview = useCallback(async (empId: string, earnings: PayrollSettlementDraftLine[]) => {
    const seq = ++previewSeqRef.current;
    setPreviewLoading(true);
    const earningPayload = earnings
      .map((l) => ({
        typeId: l.typeId,
        amount: parsePayrollAmount(l.amount),
      }))
      .filter((l) => l.amount > 0);
    const res = await previewPayrollSettlementAction({
      employeeId: empId,
      date,
      lines: earningPayload.length ? earningPayload : undefined,
    });
    if (seq !== previewSeqRef.current) {
      return;
    }
    setPreviewLoading(false);
    if (!res.success) {
      setPreviewNote(null);
      setEmployerCosts([]);
      setEmployerTotal(0);
      setDeductionLines([]);
      setError(res.error);
      return;
    }
    const data = res.data;
    setError(null);
    setEmployerCosts(
      (data.employerCosts ?? []).map((c) => ({
        code: c.code,
        label: c.label,
        amount: c.amount,
        ratePercent: c.ratePercent,
      })),
    );
    setEmployerTotal(data.totals.totalEmployerCost ?? 0);
    setPreviewNote(data.note ?? null);

    skipEarningsPreviewRef.current = true;
    setEarningLines(
      (data.suggestedEarnings ?? []).map((e) => ({
        ...newDraftLine("EARNING", e.typeId as "ORDINARY"),
        typeId: e.typeId,
        amount: String(e.amount),
      })),
    );
    setDeductionLines(
      (data.suggestedDeductions ?? []).map((d) => ({
        ...newDraftLine("DEDUCTION", d.typeId as "AFP"),
        typeId: d.typeId,
        amount: String(d.amount),
      })),
    );
    // Fuerza re-sync del plan de pago al nuevo líquido (sin lock manual previo).
    setPaymentSyncKey((k) => k + 1);
  }, [date]);

  const handleEmployeeChange = (v: string | null) => {
    const id = v != null ? String(v) : null;
    setEmployeeId(id);
    setError(null);
    if (!id) {
      setEarningLines([]);
      setDeductionLines([]);
      setEmployerCosts([]);
      setEmployerTotal(0);
      setPreviewNote(null);
      return;
    }
    const employee = employees.find((e) => e.id === id);
    const ordinary = baseSalaryAsInputValue(employee?.baseSalary);
    const seed: PayrollSettlementDraftLine[] = [
      {
        ...newDraftLine("EARNING", "ORDINARY"),
        amount: ordinary,
      },
    ];
    skipEarningsPreviewRef.current = true;
    setEarningLines(seed);
    setDeductionLines([]);
    void applyPreview(id, seed);
  };

  const patchEarningLine = useCallback(
    (id: string, patch: Partial<Pick<PayrollSettlementDraftLine, "typeId" | "amount">>) => {
      setEarningLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    },
    [],
  );

  const patchDeductionLine = useCallback(
    (id: string, patch: Partial<Pick<PayrollSettlementDraftLine, "typeId" | "amount">>) => {
      setDeductionLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    },
    [],
  );

  // Recalcular legales cuando cambian haberes o fecha (no cuando el preview los acaba de setear).
  useEffect(() => {
    if (!open || !employeeId) return;
    if (skipEarningsPreviewRef.current) {
      skipEarningsPreviewRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void applyPreview(employeeId, earningLines);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [earningLines, employeeId, date, open, applyPreview]);

  const handleClose = () => {
    setError(null);
    reset();
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    if (!employeeId) {
      setError("Seleccione un empleado.");
      return;
    }

    const payloadLines = draftLinesToPayload([...earningLines, ...deductionLines]);
    if (payloadLines.length === 0) {
      setError("Agregue al menos una línea con monto mayor a cero.");
      return;
    }

    if (!paymentValid) {
      setError("Revise el plan de pago de la liquidación.");
      return;
    }

    startTransition(() => {
      void (async () => {
        const r = await createRemunerationAction({
          employeeId,
          date: date.trim(),
          lines: payloadLines.map(({ typeId, amount }) => ({ typeId, amount })),
          settlementPayment,
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

  const canSubmit =
    !isPending &&
    !referenceLoading &&
    !previewLoading &&
    employeeId != null &&
    date.trim().length > 0 &&
    totals.earningCount > 0 &&
    totals.netPayment >= 0 &&
    paymentValid;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Crear liquidación de sueldo"
      size="lg"
      scroll="paper"
      maxHeight="min(92vh, 820px)"
      data-test-id="remuneration-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="remuneration-create-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit}>
            Crear liquidación
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <Select
          label="Empleado"
          name="remuneration-employee"
          placeholder="Seleccione empleado"
          options={employeeOptions}
          value={employeeId}
          onChange={(v) => handleEmployeeChange(v != null ? String(v) : null)}
          required
          data-test-id="remuneration-create-employee"
        />

        <TextField
          label="Fecha de liquidación"
          name="remuneration-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          data-test-id="remuneration-create-date"
        />

        <div>
          <Button
            variant="outlined"
            size="sm"
            disabled={!employeeId || isPending}
            onClick={() => {
              startTransition(() => {
                void (async () => {
                  const r = await listPayrollSuggestionsFromJornadaAction({
                    employeeId: employeeId ?? undefined,
                  });
                  if (!r.success) {
                    setError(r.error);
                    return;
                  }
                  if (!r.data.length) {
                    setError("No hay sugerencias pendientes de Jornada para este empleado.");
                    return;
                  }
                  const nextEarnings: PayrollSettlementDraftLine[] = [];
                  const nextDeductions: PayrollSettlementDraftLine[] = [];
                  for (const s of r.data) {
                    const amount = Math.round(Number(s.amountCents) || 0);
                    const line: PayrollSettlementDraftLine = {
                      ...newDraftLine(payrollLineCategory(s.typeId), s.typeId),
                      amount: String(amount > 0 ? amount : 0),
                    };
                    if (payrollLineCategory(s.typeId) === "DEDUCTION") {
                      nextDeductions.push(line);
                    } else {
                      nextEarnings.push(line);
                    }
                  }
                  setEarningLines((prev) => [...prev, ...nextEarnings]);
                  setDeductionLines((prev) => [...prev, ...nextDeductions]);
                  setError(null);
                })();
              });
            }}
            data-test-id="remuneration-import-jornada"
          >
            Importar sugerencias de Jornada
          </Button>
        </div>

        <PayrollSettlementLinesEditor
          title="Haberes"
          category="EARNING"
          lines={earningLines}
          onAddLine={() => setEarningLines((prev) => [...prev, newDraftLine("EARNING")])}
          onRemoveLine={(id) => setEarningLines((prev) => prev.filter((l) => l.id !== id))}
          onPatchLine={patchEarningLine}
          disabled={!employeeId || isPending || previewLoading}
          data-test-id="remuneration-create-earnings"
        />

        <PayrollSettlementLinesEditor
          title="Descuentos legales (trabajador)"
          category="DEDUCTION"
          lines={deductionLines}
          onAddLine={() => setDeductionLines((prev) => [...prev, newDraftLine("DEDUCTION")])}
          onRemoveLine={(id) => setDeductionLines((prev) => prev.filter((l) => l.id !== id))}
          onPatchLine={patchDeductionLine}
          disabled={!employeeId || isPending || previewLoading}
          data-test-id="remuneration-create-deductions"
        />

        {employerCosts.length > 0 ? (
          <div
            className="flex w-full flex-col gap-2 rounded-lg border border-border p-3"
            data-test-id="remuneration-employer-costs"
          >
            <p className="text-sm font-semibold text-foreground">Aportes del empleador</p>
            <p className="text-xs text-muted-foreground">
              No se descuentan del sueldo líquido. Al crear la liquidación se genera el gasto operativo
              «Cargas sociales» y su cuenta por pagar.
            </p>
            <ul className="space-y-1 text-sm">
              {employerCosts.map((c) => (
                <li key={c.code} className="flex justify-between gap-2 tabular-nums">
                  <span className="text-muted-foreground">
                    {c.label} ({c.ratePercent}%)
                  </span>
                  <span className="font-medium text-foreground">{fmtClp(c.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="flex justify-between border-t border-border pt-2 text-sm font-semibold">
              <span>Total costo empresa</span>
              <span className="tabular-nums">{fmtClp(employerTotal)}</span>
            </p>
          </div>
        ) : null}

        {previewNote ? (
          <p className="text-xs text-muted-foreground">{previewNote}</p>
        ) : null}

        <div className="flex w-full flex-col gap-3" data-test-id="remuneration-create-summary">
          <p className="text-left text-sm font-semibold text-foreground">Resumen de liquidación</p>
          <p className="text-xs text-muted-foreground">
            Al crear se generará automáticamente el gasto operativo «Sueldos» (empleado como proveedor) y
            la cuenta por pagar asociada.
          </p>
          <table className="w-full min-w-0 table-fixed text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Total haberes
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Total descuentos
                </th>
                <th className="rounded-t-md bg-muted/30 px-3 py-2.5 text-left text-sm font-semibold text-foreground">
                  Líquido a pagar
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2 text-left text-sm tabular-nums text-muted-foreground">
                  {fmtClp(totals.totalEarnings)}
                </td>
                <td className="px-3 py-2 text-left text-sm tabular-nums text-muted-foreground">
                  {fmtClp(totals.totalDeductions)}
                </td>
                <td
                  className={`rounded-b-md bg-muted/30 px-3 py-2.5 text-left text-base font-semibold tabular-nums ${
                    totals.netPayment < 0 ? "text-error" : "text-foreground"
                  }`}
                >
                  {fmtClp(totals.netPayment)}
                </td>
              </tr>
            </tbody>
          </table>
          {totals.netPayment < 0 ? (
            <p className="text-left text-xs text-error">Los descuentos superan los haberes.</p>
          ) : null}
        </div>

        <PlannedPaymentPlanSection
          key={`payroll-pay-${paymentSyncKey}`}
          disabled={isPending || referenceLoading || previewLoading}
          total={totals.netPayment}
          immediatePaymentDate={date}
          payeeSelected={Boolean(employeeId)}
          payeeBankAccounts={payeeBankAccounts}
          companyBankAccounts={companyBankAccounts}
          cashHubOptions={cashHubOptions}
          schedule={{ kind: "monthly-chain" }}
          scheduledLinesBehavior="equal-split"
          sectionTitle="Pago de la liquidación"
          headerExtra={
            <p className="text-xs text-muted-foreground">
              Líquido a pagar:{" "}
              <span className="font-medium tabular-nums text-foreground">
                {fmtClp(totals.netPayment)}
              </span>
            </p>
          }
          payeeBankAccountLabel="Cuenta empleado (destino)"
          payeeRequiredMessage={
            !employeeId ? "Seleccione un empleado para planificar el pago." : null
          }
          strictZeroTotal
          totalLabel="líquido a pagar"
          scheduleBalanceHintVariant="bordered"
          onStateChange={onPaymentStateChange}
          data-test-id="payroll-settlement-payment-section"
          paymentModeSelectName="payroll-settlement-payment-mode"
          partialAmountTestId="payroll-settlement-partial-amount"
        />
      </div>
    </Dialog>
  );
}
