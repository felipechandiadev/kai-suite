"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Receipt, Wallet } from "lucide-react";
import { Card } from "@kai/ui";
import Badge from "@kai/ui";
import { Switch } from "@kai/ui";
import { DeleteDialog } from "@kai/ui";
import type {
  ExpenseCategoryListItem,
  OperationalGroupMetaItem,
} from "@/features/expense-categories/types/expense-category.types";
import {
  deleteExpenseCategoryAction,
  updateExpenseCategoryActiveAction,
} from "@/features/expense-categories/actions/expense-category.action";
import { UpdateExpenseCategoryDialog } from "./UpdateExpenseCategoryDialog";

function formatMoney(n: number): string {
  try {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
      Math.round(n),
    );
  } catch {
    return String(Math.round(n));
  }
}

type ExpenseCategoryCardProps = {
  category: ExpenseCategoryListItem;
  groupOptions: OperationalGroupMetaItem[];
  "data-test-id"?: string;
};

export function ExpenseCategoryCard({
  category,
  groupOptions,
  "data-test-id": dataTestId,
}: ExpenseCategoryCardProps) {
  const router = useRouter();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [active, setActive] = useState(category.isActive);
  const [activeError, setActiveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const groupLabel = useMemo(() => {
    const m = groupOptions.find((g) => g.value === category.operationalExpenseGroup);
    return m?.label ?? category.operationalExpenseGroup;
  }, [category.operationalExpenseGroup, groupOptions]);

  useEffect(() => {
    setActive(category.isActive);
  }, [category.isActive, category.id]);

  const headerEnd = (
    <span className="shrink-0" data-test-id="expense-category-card-active-label">
      <Badge variant={category.isActive ? "success" : "secondary-outlined"}>
        {category.isActive ? "Activa" : "Inactiva"}
      </Badge>
    </span>
  );

  const media = (
    <div
      className="relative flex min-h-[7.5rem] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/[0.12] via-secondary/25 to-accent/15"
      data-test-id="expense-category-card-media"
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-secondary/30 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-8 -left-6 h-32 w-32 rounded-full bg-primary/20 blur-3xl" aria-hidden />
      <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border-2 border-secondary bg-white/90 shadow-md backdrop-blur-sm">
        <Wallet className="h-9 w-9 text-primary" strokeWidth={1.75} aria-hidden />
      </div>
    </div>
  );

  const content = (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-test-id="expense-category-card-body">
      <div className="rounded-lg border border-border/60 px-3 py-2.5">
        <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">Grupo operativo</p>
        <p className="text-sm text-foreground" data-test-id="expense-category-card-group">
          {groupLabel}
        </p>
      </div>

      <div className="rounded-lg border border-border/60 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
          <Receipt className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Descripción
        </p>
        <p className="text-sm leading-snug text-foreground" data-test-id="expense-category-card-desc">
          {category.description?.trim() ? category.description.trim() : "Sin descripción"}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5" data-test-id="expense-category-card-badges">
        {category.requiresApproval ? (
          <Badge variant="warning-outlined">Requiere aprobación · {formatMoney(category.approvalThreshold)}</Badge>
        ) : (
          <Badge variant="secondary-outlined">Sin aprobación</Badge>
        )}
        {category.defaultResultCenterName ? (
          <span className="inline-flex max-w-full" title="Centro de resultado por defecto">
            <Badge variant="info-outlined" className="max-w-full truncate">
              {category.defaultResultCenterName}
            </Badge>
          </span>
        ) : null}
      </div>

      {activeError ? (
        <p className="text-sm text-red-600" role="alert" data-test-id="expense-category-card-active-error">
          {activeError}
        </p>
      ) : null}

      <div className="mt-auto">
        <Switch
          checked={active}
          disabled={isPending}
          onChange={(v) => {
            setActiveError(null);
            const prev = active;
            setActive(v);
            startTransition(() => {
              void (async () => {
                const r = await updateExpenseCategoryActiveAction(category.id, v);
                if (!r.success) {
                  setActive(prev);
                  setActiveError(r.error);
                } else {
                  await router.refresh();
                }
              })();
            });
          }}
          label="Activa en catálogo"
          labelPosition="right"
          data-test-id="expense-category-card-active-switch"
        />
      </div>
    </div>
  );

  return (
    <>
      <Card
        fillHeight
        className="h-full overflow-hidden border-border/90 shadow-sm transition-shadow duration-200 hover:shadow-md"
        data-test-id={dataTestId}
        media={media}
        title={category.name}
        headerEnd={headerEnd}
        content={content}
        actions={[
          {
            id: "update",
            icon: "Pencil",
            ariaLabel: "Editar categoría",
            onClick: () => setUpdateOpen(true),
            "data-test-id": "expense-category-card-update",
          },
          {
            id: "delete",
            icon: "Trash2",
            ariaLabel: "Eliminar categoría",
            disabled: isDeleting,
            onClick: () => {
              setDeleteErrors([]);
              setDeleteOpen(true);
            },
            "data-test-id": "expense-category-card-delete",
          },
        ]}
      />
      <UpdateExpenseCategoryDialog
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        category={category}
        groupOptions={groupOptions}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
      <DeleteDialog
        open={deleteOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteOpen(false);
            setDeleteErrors([]);
          }
        }}
        title="Eliminar categoría"
        message={
          <>
            ¿Eliminar la categoría <strong className="font-semibold">«{category.name}»</strong>? Esta acción no se puede
            deshacer.
          </>
        }
        errors={deleteErrors}
        isSubmitting={isDeleting}
        onConfirm={() => {
          setDeleteErrors([]);
          setIsDeleting(true);
          void (async () => {
            try {
              const r = await deleteExpenseCategoryAction(category.id);
              if (r.success) {
                setDeleteOpen(false);
                await router.refresh();
              } else {
                setDeleteErrors([r.error]);
              }
            } finally {
              setIsDeleting(false);
            }
          })();
        }}
        data-test-id={`${dataTestId ?? "expense-category-card"}-delete-dialog`}
      />
    </>
  );
}
