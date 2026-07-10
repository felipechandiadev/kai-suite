"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { SelectDefault as Select } from "@kai/ui";
import { Switch } from "@kai/ui";
import type { AccountHierarchyNode } from "@/features/accounting-chart-of-accounts/types/chart-of-accounts.types";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import type { ExpenseCategoryListItem } from "@/features/expense-categories/types/expense-category.types";
import type { AccountingRuleListItem } from "@/features/accounting-rules/types/accounting-rule.types";
import { updateAccountingRuleAction } from "@/features/accounting-rules/actions/accounting-rule.action";
import {
  PAYMENT_METHOD_OPTIONS,
  RULE_LINE_AMOUNT_MODE_OPTIONS,
  RULE_LINE_SIDE_OPTIONS,
} from "./ruleOptions";
import type { AccountingRuleLineAmountMode, AccountingRuleLineSide } from "@/features/accounting-rules/types/accounting-rule.types";

export type UpdateAccountingRuleDialogProps = {
  open: boolean;
  onClose: () => void;
  rule: AccountingRuleListItem;
  accountsHierarchy: AccountHierarchyNode[];
  taxes: TaxListItem[];
  expenseCategories: ExpenseCategoryListItem[];
};

function flattenAccounts(nodes: AccountHierarchyNode[], depth = 0, out: { id: string; label: string }[] = []) {
  for (const n of nodes) {
    const pad = "—".repeat(Math.min(6, Math.max(0, depth)));
    const prefix = pad ? `${pad} ` : "";
    out.push({ id: n.id, label: `${prefix}${n.code} ${n.name}` });
    if (n.children?.length) flattenAccounts(n.children, depth + 1, out);
  }
  return out;
}

export function UpdateAccountingRuleDialog({
  open,
  onClose,
  rule,
  accountsHierarchy,
  taxes,
  expenseCategories,
}: UpdateAccountingRuleDialogProps) {
  const router = useRouter();
  const [expenseCategoryId, setExpenseCategoryId] = useState<string>(rule.expenseCategoryId ?? "");
  const [taxId, setTaxId] = useState<string>(rule.taxId ?? "");
  const [paymentMethod, setPaymentMethod] = useState<string>(rule.paymentMethod ?? "");
  const [priorityStr, setPriorityStr] = useState<string>(String(rule.priority ?? 0));
  const [isActive, setIsActive] = useState<boolean>(rule.isActive !== false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [lines, setLines] = useState<
    Array<{
      side: AccountingRuleLineSide;
      accountId: string;
      amountMode: AccountingRuleLineAmountMode;
      amountValue: string;
      isActive: boolean;
    }>
  >([]);

  const accountOptions = useMemo(() => flattenAccounts(accountsHierarchy), [accountsHierarchy]);
  const taxOptions = useMemo(
    () => [{ id: "", label: "Cualquier impuesto" }, ...taxes.map((t) => ({ id: t.id, label: `${t.name}${t.code ? ` (${t.code})` : ""}` }))],
    [taxes],
  );
  const expenseOptions = useMemo(
    () => [
      { id: "", label: "Cualquier categoría" },
      ...expenseCategories.map((c) => ({ id: c.id, label: `${c.name}${c.code ? ` (${c.code})` : ""}` })),
    ],
    [expenseCategories],
  );

  useEffect(() => {
    if (!open) return;
    setExpenseCategoryId(rule.expenseCategoryId ?? "");
    setTaxId(rule.taxId ?? "");
    setPaymentMethod(rule.paymentMethod ?? "");
    setPriorityStr(String(rule.priority ?? 0));
    setIsActive(rule.isActive !== false);
    setError(null);

    const fromLines = Array.isArray(rule.lines) && rule.lines.length > 0 ? rule.lines : null;
    if (fromLines) {
      const next = [...fromLines]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((l) => ({
          side: l.side as any,
          accountId: l.accountId,
          amountMode: l.amountMode as any,
          amountValue: l.amountMode === "FIXED" && l.amountValue != null ? String(l.amountValue) : "",
          isActive: l.isActive !== false,
        }));
      setLines(next.length >= 2 ? next : [
        { side: "DEBIT", accountId: rule.debitAccountId, amountMode: "TOTAL", amountValue: "", isActive: true },
        { side: "CREDIT", accountId: rule.creditAccountId, amountMode: "TOTAL", amountValue: "", isActive: true },
      ]);
    } else {
      setLines([
        { side: "DEBIT", accountId: rule.debitAccountId, amountMode: "TOTAL", amountValue: "", isActive: true },
        { side: "CREDIT", accountId: rule.creditAccountId, amountMode: "TOTAL", amountValue: "", isActive: true },
      ]);
    }
  }, [open, rule]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const activeLines = lines.filter((l) => l.isActive !== false);
  const hasDebit = activeLines.some((l) => l.side === "DEBIT" && l.accountId);
  const hasCredit = activeLines.some((l) => l.side === "CREDIT" && l.accountId);
  const hasAllAccounts = activeLines.every((l) => !l.isActive || Boolean(l.accountId));
  const canSubmit = hasDebit && hasCredit && hasAllAccounts && !isPending;

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await updateAccountingRuleAction({
          id: rule.id,
          expenseCategoryId: expenseCategoryId || null,
          taxId: taxId || null,
          paymentMethod: paymentMethod || null,
          priority: priorityStr,
          isActive,
          lines: lines
            .filter((l) => l.isActive !== false)
            .map((l, idx) => ({
              side: l.side,
              accountId: l.accountId,
              amountMode: l.amountMode,
              amountValue: l.amountMode === "FIXED" ? (l.amountValue ? Number(l.amountValue) : 0) : null,
              sortOrder: idx,
              isActive: true,
            })),
        } as any);
        if (r.success) {
          router.refresh();
          handleClose();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const subtitle = `${rule.transactionType} · ${rule.appliesTo} · Prioridad ${rule.priority}`;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Actualizar regla contable"
      size="lg"
      scroll="paper"
      maxHeight="min(90vh, 800px)"
      data-test-id="rule-update-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="rule-update-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="rule-update-cancel">
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit} data-test-id="rule-update-submit">
            Actualizar
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-muted" data-test-id="rule-update-subtitle">
        {subtitle}
      </p>
      <div className="flex w-full min-w-0 flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-2" data-test-id="rule-update-lines">
          <p className="text-sm font-medium text-foreground">Líneas contables</p>
          <div className="flex min-w-0 flex-col gap-3">
            {lines.map((l, idx) => (
              <div
                key={idx}
                className="grid w-full min-w-0 grid-cols-1 gap-3 rounded-md border border-border p-3 md:grid-cols-12"
                data-test-id={`rule-update-line-${idx}`}
              >
                <div className="md:col-span-3">
                  <Select
                    label="Debe/Haber"
                    name={`rule-update-line-side-${idx}`}
                    value={l.side}
                    onChange={(id) =>
                      setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, side: String(id) as any } : x)))
                    }
                    options={RULE_LINE_SIDE_OPTIONS}
                    required
                  />
                </div>
                <div className="md:col-span-5">
                  <Select
                    label="Cuenta"
                    name={`rule-update-line-account-${idx}`}
                    value={l.accountId}
                    onChange={(id) =>
                      setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, accountId: String(id) } : x)))
                    }
                    options={accountOptions}
                    required
                  />
                </div>
                <div className="md:col-span-3">
                  <Select
                    label="Monto"
                    name={`rule-update-line-amount-${idx}`}
                    value={l.amountMode}
                    onChange={(id) =>
                      setLines((prev) =>
                        prev.map((x, i) =>
                          i === idx
                            ? {
                                ...x,
                                amountMode: String(id) as any,
                                amountValue: String(id) === "FIXED" ? x.amountValue : "",
                              }
                            : x,
                        ),
                      )
                    }
                    options={RULE_LINE_AMOUNT_MODE_OPTIONS}
                    required
                  />
                </div>
                <div className="md:col-span-1">
                  <Button
                    variant="outlined"
                    size="md"
                    onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                    disabled={isPending || lines.length <= 2}
                    data-test-id={`rule-update-line-remove-${idx}`}
                  >
                    Quitar
                  </Button>
                </div>
                {l.amountMode === "FIXED" ? (
                  <div className="md:col-span-12">
                    <TextField
                      label="Monto fijo"
                      name={`rule-update-line-fixed-${idx}`}
                      value={l.amountValue}
                      onChange={(e) =>
                        setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, amountValue: e.target.value } : x)))
                      }
                      placeholder="Monto fijo"
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div>
            <Button
              variant="outlined"
              size="md"
              onClick={() =>
                setLines((prev) => [
                  ...prev,
                  { side: "DEBIT", accountId: "", amountMode: "TOTAL", amountValue: "", isActive: true },
                ])
              }
              disabled={isPending}
              data-test-id="rule-update-line-add"
            >
              Agregar línea
            </Button>
          </div>
        </div>

        <div className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
          <Select
            label="Categoría de gasto (opcional)"
            name="rule-update-expense-category"
            value={expenseCategoryId}
            onChange={(id) => setExpenseCategoryId(String(id))}
            options={expenseOptions}
            data-test-id="rule-update-expense-category"
          />
          <Select
            label="Impuesto (opcional)"
            name="rule-update-tax"
            value={taxId}
            onChange={(id) => setTaxId(String(id))}
            options={taxOptions}
            data-test-id="rule-update-tax"
          />
          <Select
            label="Método de pago (opcional)"
            name="rule-update-payment-method"
            value={paymentMethod}
            onChange={(id) => setPaymentMethod(String(id))}
            options={PAYMENT_METHOD_OPTIONS}
            data-test-id="rule-update-payment-method"
          />
        </div>

        <TextField
          label="Prioridad"
          name="rule-update-priority"
          value={priorityStr}
          onChange={(e) => setPriorityStr(e.target.value)}
          placeholder="Prioridad"
          data-test-id="rule-update-priority"
        />
        <div className="pt-1">
          <Switch checked={isActive} onChange={setIsActive} label="Regla activa" labelPosition="right" data-test-id="rule-update-active" />
        </div>
      </div>
    </Dialog>
  );
}

