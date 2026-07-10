"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@kai/ui";
import DeleteDialog from "@kai/ui";
import type { AccountHierarchyNode } from "@/features/accounting-chart-of-accounts/types/chart-of-accounts.types";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import type { ExpenseCategoryListItem } from "@/features/expense-categories/types/expense-category.types";
import type { AccountingRuleListItem } from "@/features/accounting-rules/types/accounting-rule.types";
import { deleteAccountingRuleAction } from "@/features/accounting-rules/actions/accounting-rule.action";
import { UpdateAccountingRuleDialog } from "./UpdateAccountingRuleDialog";

function accountLabel(a: { code?: string; name?: string; id: string } | null | undefined, fallbackId: string) {
  const code = a?.code?.trim();
  const name = a?.name?.trim();
  if (code && name) return `${code} ${name}`;
  if (code) return code;
  if (name) return name;
  return fallbackId;
}

export function AccountingRuleCard({
  rule,
  accountsHierarchy,
  taxes,
  expenseCategories,
}: {
  rule: AccountingRuleListItem;
  accountsHierarchy: AccountHierarchyNode[];
  taxes: TaxListItem[];
  expenseCategories: ExpenseCategoryListItem[];
}) {
  const router = useRouter();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string[]>([]);
  const [isDeleting, startDelete] = useTransition();

  const title = `${rule.transactionType}`;
  const subtitle = `${rule.appliesTo} · Prioridad ${rule.priority}`;
  const debit = accountLabel(rule.debitAccount ?? null, rule.debitAccountId);
  const credit = accountLabel(rule.creditAccount ?? null, rule.creditAccountId);

  const meta = useMemo(() => {
    const parts: string[] = [];
    if (rule.paymentMethod) parts.push(`Pago: ${rule.paymentMethod}`);
    if (rule.tax?.name) parts.push(`Impuesto: ${rule.tax.name}`);
    if (rule.expenseCategory?.name) parts.push(`Categoría: ${rule.expenseCategory.name}`);
    return parts;
  }, [rule]);

  const headerEnd = (
    <span className={rule.isActive ? "text-xs font-medium text-emerald-700 dark:text-emerald-400" : "text-xs font-medium text-muted-foreground"}>
      {rule.isActive ? "Activa" : "Inactiva"}
    </span>
  );

  const handleConfirmDelete = async () => {
    setDeleteError([]);
    startDelete(() => {
      void (async () => {
        const r = await deleteAccountingRuleAction(rule.id);
        if (r.success) {
          router.refresh();
          setDeleteOpen(false);
        } else {
          setDeleteError([r.error]);
        }
      })();
    });
  };

  return (
    <>
      <Card
        title={title}
        subtitle={subtitle}
        headerEnd={headerEnd}
        fillHeight
        content={
          <div className="flex min-w-0 flex-col gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Débito → Crédito</p>
              <p className="truncate text-sm text-foreground" title={`${debit} → ${credit}`}>
                <span className="font-medium">{debit}</span> <span className="text-muted-foreground">→</span>{" "}
                <span className="font-medium">{credit}</span>
              </p>
            </div>
            {meta.length > 0 ? (
              <ul className="list-disc pl-5 text-xs text-muted-foreground">
                {meta.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Sin condiciones adicionales.</p>
            )}
          </div>
        }
        actions={[
          {
            icon: "Pencil",
            ariaLabel: "Actualizar regla",
            onClick: () => setUpdateOpen(true),
            "data-test-id": `rule-card-edit-${rule.id}`,
          },
          {
            icon: "Trash2",
            ariaLabel: "Desactivar regla",
            onClick: () => setDeleteOpen(true),
            "data-test-id": `rule-card-delete-${rule.id}`,
          },
        ]}
        data-test-id={`rule-card-${rule.id}`}
      />

      <UpdateAccountingRuleDialog
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        rule={rule}
        accountsHierarchy={accountsHierarchy}
        taxes={taxes}
        expenseCategories={expenseCategories}
      />

      <DeleteDialog
        open={deleteOpen}
        onClose={() => {
          if (isDeleting) return;
          setDeleteError([]);
          setDeleteOpen(false);
        }}
        onConfirm={handleConfirmDelete}
        title="Desactivar regla"
        confirmLabel="Desactivar"
        message={
          <>
            ¿Seguro que quieres desactivar la regla <span className="font-semibold">{rule.transactionType}</span>?
          </>
        }
        isSubmitting={isDeleting}
        errors={deleteError}
        data-test-id={`rule-delete-dialog-${rule.id}`}
      />
    </>
  );
}

