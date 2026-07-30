"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Badge,
  DataGridTable as DataGrid,
  IconButton,
  Select,
  type DataGridColumn,
} from "@kai/ui";
import {
  PROMOTION_ACTIVATION_LABEL,
  PROMOTION_STATUS_LABEL,
  PROMOTION_TYPE_LABEL,
  type PromotionEffectiveStatus,
  type PromotionRow,
} from "@/features/promotions/types/promotion.types";
import {
  deletePromotionAction,
  togglePromotionActiveAction,
} from "@/features/promotions/actions/promotions.action";
import { PromotionEditorDialog } from "../editor/PromotionEditorDialog";

type Props = {
  rows: PromotionRow[];
  total: number;
  loadError: string | null;
};

type Option = { id: string; label: string };

function formatMoney(n: number, currency = "CLP"): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CL");
}

function StatusBadge({ status }: { status: PromotionEffectiveStatus }) {
  const variant =
    status === "ACTIVE"
      ? "success-outlined"
      : status === "EXPIRING_SOON"
        ? "warning-outlined"
        : "secondary-outlined";
  return <Badge variant={variant as never}>{PROMOTION_STATUS_LABEL[status]}</Badge>;
}

/** Filtro Select sincronizado con la URL; resetea `page` al cambiar. */
function PromotionSelectFilter({
  param,
  label,
  options,
  testId,
}: {
  param: string;
  label: string;
  options: Option[];
  testId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get(param) || "";

  const apply = (value: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) {
      next.set(param, value);
    } else {
      next.delete(param);
    }
    next.set("page", "1");
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?page=1", { scroll: false });
  };

  return (
    <div className="min-w-[11rem] max-w-xs" data-test-id={testId}>
      <Select
        label={label}
        name={`${param}-filter`}
        placeholder="Todas"
        options={options}
        value={current || null}
        onChange={(id) => apply(id == null ? null : String(id))}
        allowClear
        density="compact"
        labelLayout="inline"
        alwaysShowLabel
        data-test-id={`${testId}-select`}
      />
    </div>
  );
}

export default function PromotionsDataGrid({ rows, total, loadError }: Props) {
  const router = useRouter();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const activeOptions = useMemo<Option[]>(
    () => [
      { id: "true", label: "Activas" },
      { id: "false", label: "Inactivas" },
    ],
    [],
  );

  const typeOptions = useMemo<Option[]>(
    () => Object.entries(PROMOTION_TYPE_LABEL).map(([id, label]) => ({ id, label })),
    [],
  );

  const activationOptions = useMemo<Option[]>(
    () => Object.entries(PROMOTION_ACTIVATION_LABEL).map(([id, label]) => ({ id, label })),
    [],
  );

  const handleToggleActive = useCallback(
    async (p: PromotionRow) => {
      const res = await togglePromotionActiveAction(p.id, !p.isActive);
      if (res.success) router.refresh();
    },
    [router],
  );

  const handleDelete = useCallback(
    async (p: PromotionRow) => {
      if (
        !confirm(
          `¿Eliminar la promoción "${p.name}"? Esta acción es reversible mediante restauración manual.`,
        )
      ) {
        return;
      }
      const res = await deletePromotionAction(p.id);
      if (res.success) router.refresh();
    },
    [router],
  );

  const openEdit = useCallback((p: PromotionRow) => {
    setEditingId(p.id);
    setEditorOpen(true);
  }, []);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setEditorOpen(true);
  }, []);

  const columns: DataGridColumn[] = useMemo(() => {
    function PromotionActionsCell({ row }: { row: unknown }) {
      const p = row as PromotionRow;
      return (
        <div
          className="flex items-center justify-end gap-1"
          data-test-id={`promotions-row-actions-${p.id}`}
        >
          <IconButton
            icon={p.isActive ? "Eye" : "EyeOff"}
            variant="action"
            size="sm"
            ariaLabel={p.isActive ? "Desactivar" : "Activar"}
            onClick={() => void handleToggleActive(p)}
            data-test-id={`promotions-row-toggle-${p.id}`}
          />
          <IconButton
            icon="Edit"
            variant="action"
            size="sm"
            ariaLabel="Editar"
            onClick={() => openEdit(p)}
            data-test-id={`promotions-row-edit-${p.id}`}
          />
          <IconButton
            icon="Trash"
            variant="action"
            size="sm"
            ariaLabel="Eliminar"
            onClick={() => void handleDelete(p)}
            data-test-id={`promotions-row-delete-${p.id}`}
          />
        </div>
      );
    }

    return [
      {
        field: "code",
        headerName: "Código",
        sortable: true,
        width: 130,
        renderCell: ({ row }) => (
          <span className="font-mono">{(row as PromotionRow).code}</span>
        ),
      },
      {
        field: "name",
        headerName: "Nombre",
        sortable: true,
        minWidth: 180,
        flex: 1,
        cellOverflow: "wrap",
      },
      {
        field: "type",
        headerName: "Tipo",
        sortable: true,
        width: 150,
        valueGetter: ({ row }) => PROMOTION_TYPE_LABEL[(row as PromotionRow).type],
      },
      {
        field: "value",
        headerName: "Valor",
        sortable: true,
        width: 120,
        align: "right",
        renderCell: ({ row }) => {
          const p = row as PromotionRow;
          return (
            <span className="tabular-nums">
              {p.type.startsWith("PERCENT")
                ? `${Number(p.value)}%`
                : formatMoney(Number(p.value))}
            </span>
          );
        },
      },
      {
        field: "validUntil",
        headerName: "Vigencia",
        sortable: true,
        minWidth: 170,
        renderCell: ({ row }) => {
          const p = row as PromotionRow;
          return (
            <span className="text-xs">
              {formatDate(p.validFrom)} → {formatDate(p.validUntil)}
            </span>
          );
        },
      },
      {
        field: "activation",
        headerName: "Activación",
        sortable: true,
        minWidth: 150,
        renderCell: ({ row }) => {
          const p = row as PromotionRow;
          return (
            <span className="text-xs">
              {PROMOTION_ACTIVATION_LABEL[p.activation]}
              {p.activation === "CODE_ENTRY" && p.redemptionCode ? (
                <span className="ml-1 font-mono text-muted-foreground">
                  ({p.redemptionCode})
                </span>
              ) : null}
            </span>
          );
        },
      },
      {
        field: "usesCount",
        headerName: "Usos",
        sortable: true,
        width: 100,
        align: "right",
        renderCell: ({ row }) => {
          const p = row as PromotionRow;
          return (
            <span className="tabular-nums">
              {p.usesCount}
              {p.maxUsesTotal != null ? (
                <span className="text-xs text-muted-foreground">/{p.maxUsesTotal}</span>
              ) : null}
            </span>
          );
        },
      },
      {
        field: "effectiveStatus",
        headerName: "Estado",
        sortable: false,
        width: 120,
        renderCell: ({ row }) => (
          <StatusBadge status={(row as PromotionRow).effectiveStatus} />
        ),
      },
      {
        field: "actions",
        headerName: "",
        width: 128,
        minWidth: 128,
        maxWidth: 128,
        align: "right",
        sortable: false,
        filterable: false,
        actionComponent: PromotionActionsCell,
      },
    ];
  }, [handleToggleActive, handleDelete, openEdit]);

  return (
    <>
      {loadError ? (
        <p className="p-4 text-sm text-error" data-test-id="promotions-page-error">
          {loadError}
        </p>
      ) : null}
      <DataGrid
        title="Promociones"
        columns={columns}
        rows={rows}
        totalRows={total}
        totalGeneral={total}
        fillViewport
        showExportButton={false}
        showFilterButton={false}
        onAddClick={openCreate}
        pinActionsColumn
        actionsColumnField="actions"
        headerActions={
          <>
            <PromotionSelectFilter
              param="isActive"
              label="Estado"
              options={activeOptions}
              testId="promotions-filter-active"
            />
            <PromotionSelectFilter
              param="type"
              label="Tipo"
              options={typeOptions}
              testId="promotions-filter-type"
            />
            <PromotionSelectFilter
              param="activation"
              label="Activación"
              options={activationOptions}
              testId="promotions-filter-activation"
            />
          </>
        }
        data-test-id="promotions-data-grid"
      />

      <PromotionEditorDialog
        open={editorOpen}
        promotionId={editingId}
        onClose={() => setEditorOpen(false)}
        onSaved={() => {
          setEditorOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
