"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@kai/ui";
import { Select } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Badge } from "@kai/ui";
import { IconButton } from "@kai/ui";
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
import { PromotionEditorDialog } from "./editor/PromotionEditorDialog";

type Props = {
  initialItems: PromotionRow[];
  initialTotal: number;
  loadError: string | null;
  initialFilters: {
    search?: string;
    isActive?: string;
    type?: string;
    activation?: string;
  };
};

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
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CL");
}

function StatusBadge({ status }: { status: PromotionEffectiveStatus }) {
  const variant =
    status === "ACTIVE"
      ? "success-outlined"
      : status === "EXPIRING_SOON"
        ? "warning-outlined"
        : status === "EXPIRED"
          ? "secondary-outlined"
          : "secondary-outlined";
  return (
    <Badge variant={variant as any}>
      {PROMOTION_STATUS_LABEL[status]}
    </Badge>
  );
}

export function PromotionsPageContent({
  initialItems,
  initialTotal,
  loadError,
  initialFilters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [search, setSearch] = useState(initialFilters.search ?? "");
  const [isActive, setIsActive] = useState(initialFilters.isActive ?? "");
  const [typeFilter, setTypeFilter] = useState(initialFilters.type ?? "");
  const [activationFilter, setActivationFilter] = useState(
    initialFilters.activation ?? "",
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const items = initialItems;
  const total = initialTotal;

  const activeOptions = useMemo(
    () => [
      { id: "", label: "Todas" },
      { id: "true", label: "Activas" },
      { id: "false", label: "Inactivas" },
    ],
    [],
  );

  const typeOptions = useMemo(
    () => [
      { id: "", label: "Todos" },
      ...Object.entries(PROMOTION_TYPE_LABEL).map(([id, label]) => ({ id, label })),
    ],
    [],
  );

  const activationOptions = useMemo(
    () => [
      { id: "", label: "Todas" },
      ...Object.entries(PROMOTION_ACTIVATION_LABEL).map(([id, label]) => ({
        id,
        label,
      })),
    ],
    [],
  );

  function applyFilters() {
    const params = new URLSearchParams(sp.toString());
    const set = (k: string, v: string) => {
      if (v.trim()) params.set(k, v.trim());
      else params.delete(k);
    };
    set("search", search);
    set("isActive", isActive);
    set("type", typeFilter);
    set("activation", activationFilter);
    router.replace(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    setSearch("");
    setIsActive("");
    setTypeFilter("");
    setActivationFilter("");
    router.replace(pathname);
  }

  async function handleToggleActive(p: PromotionRow) {
    const res = await togglePromotionActiveAction(p.id, !p.isActive);
    if (res.success) router.refresh();
  }

  async function handleDelete(p: PromotionRow) {
    if (
      !confirm(
        `¿Eliminar la promoción "${p.name}"? Esta acción es reversible mediante restauración manual.`,
      )
    )
      return;
    const res = await deletePromotionAction(p.id);
    if (res.success) router.refresh();
  }

  function openCreate() {
    setEditingId(null);
    setEditorOpen(true);
  }

  function openEdit(p: PromotionRow) {
    setEditingId(p.id);
    setEditorOpen(true);
  }

  return (
    <div
      className="flex w-full flex-col gap-4 p-4 md:p-6"
      data-test-id="promotions-page-root"
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Promociones
          </h1>
          <p className="text-sm text-muted-foreground">
            Descuentos automáticos, manuales y cupones que se aplican en el POS.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={openCreate}
          data-test-id="promotions-page-create"
        >
          Nueva promoción
        </Button>
      </header>

      <section
        className="rounded-xl border border-border bg-card p-4 shadow-sm"
        data-test-id="promotions-page-filters"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <TextField
            label="Buscar"
            placeholder="Código o nombre"
            value={search}
            onChange={(e) =>
              setSearch((e as React.ChangeEvent<HTMLInputElement>).target.value)
            }
            data-test-id="promotions-page-filter-search"
          />
          <Select
            label="Estado"
            options={activeOptions}
            value={isActive}
            onChange={(v) => setIsActive((v as string) ?? "")}
            data-test-id="promotions-page-filter-active"
          />
          <Select
            label="Tipo"
            options={typeOptions}
            value={typeFilter}
            onChange={(v) => setTypeFilter((v as string) ?? "")}
            data-test-id="promotions-page-filter-type"
          />
          <Select
            label="Activación"
            options={activationOptions}
            value={activationFilter}
            onChange={(v) => setActivationFilter((v as string) ?? "")}
            data-test-id="promotions-page-filter-activation"
          />
          <div className="flex items-end gap-2">
            <Button variant="primary" onClick={applyFilters}>
              Aplicar
            </Button>
            <Button variant="outlinedSecondary" onClick={clearFilters}>
              Limpiar
            </Button>
          </div>
        </div>
      </section>

      {loadError ? (
        <p className="text-sm text-error">{loadError}</p>
      ) : items.length === 0 ? (
        <div
          className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground"
          data-test-id="promotions-page-empty"
        >
          No hay promociones con los filtros actuales.
        </div>
      ) : (
        <>
          <div className="text-xs text-muted-foreground">
            {total} promoción{total === 1 ? "" : "es"}
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <table
              className="w-full border-collapse text-sm"
              data-test-id="promotions-page-table"
            >
              <thead className="bg-muted/10 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Código</th>
                  <th className="px-3 py-2 text-left">Nombre</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-left">Vigencia</th>
                  <th className="px-3 py-2 text-left">Activación</th>
                  <th className="px-3 py-2 text-right">Usos</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-border hover:bg-muted/10"
                    data-test-id={`promotions-row-${p.id}`}
                  >
                    <td className="px-3 py-2 font-mono">{p.code}</td>
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2 text-xs">
                      {PROMOTION_TYPE_LABEL[p.type]}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {p.type.startsWith("PERCENT")
                        ? `${Number(p.value)}%`
                        : formatMoney(Number(p.value))}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {formatDate(p.validFrom)} → {formatDate(p.validUntil)}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {PROMOTION_ACTIVATION_LABEL[p.activation]}
                      {p.activation === "CODE_ENTRY" && p.redemptionCode ? (
                        <span className="ml-1 font-mono text-muted-foreground">
                          ({p.redemptionCode})
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {p.usesCount}
                      {p.maxUsesTotal != null ? (
                        <span className="text-xs text-muted-foreground">
                          /{p.maxUsesTotal}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={p.effectiveStatus} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <IconButton
                          icon={p.isActive ? "Eye" : "EyeOff"}
                          variant="action"
                          size="sm"
                          ariaLabel={p.isActive ? "Desactivar" : "Activar"}
                          onClick={() => handleToggleActive(p)}
                        />
                        <IconButton
                          icon="Edit"
                          variant="action"
                          size="sm"
                          ariaLabel="Editar"
                          onClick={() => openEdit(p)}
                        />
                        <IconButton
                          icon="Trash"
                          variant="action"
                          size="sm"
                          ariaLabel="Eliminar"
                          onClick={() => handleDelete(p)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <PromotionEditorDialog
        open={editorOpen}
        promotionId={editingId}
        onClose={() => setEditorOpen(false)}
        onSaved={() => {
          setEditorOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
