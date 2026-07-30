"use client";
import { LoadingState } from '@kai/ui';

import { useCallback, useEffect, useState } from "react";
import type { SupplierDetailView, UpdateSupplierPayload } from "@/features/purchasing-suppliers/types/supplier.types";
import { TextField } from "@kai/ui";
import { Select, type Option } from "@kai/ui";
import { IconButton } from "@kai/ui";
import { updateSupplierAction } from "@/features/purchasing-suppliers/actions/supplier.action";

const SUPPLIER_TYPE_OPTIONS: Option[] = [
  { id: "MANUFACTURER", label: "Fabricante" },
  { id: "DISTRIBUTOR", label: "Distribuidor" },
  { id: "WHOLESALER", label: "Mayorista" },
  { id: "SERVICE_PROVIDER", label: "Proveedor de servicios" },
  { id: "CONTRACTOR", label: "Contratista" },
  { id: "LOGISTICS", label: "Logística" },
  { id: "IMPORTER", label: "Importador" },
];

type CommercialDraft = {
  alias: string;
  supplierType: string;
  termStr: string;
};

function draftFromDetail(d: SupplierDetailView): CommercialDraft {
  return {
    alias: d.alias?.trim() ?? "",
    supplierType: d.supplierType?.trim() || "DISTRIBUTOR",
    termStr: String(Math.max(0, Math.round(Number(d.defaultPaymentTermDays) || 0))),
  };
}

const noopFieldChange = (_e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {};

export function SupplierDetailCommercialSection({
  detail,
  loading,
  supplierId,
  onDetailUpdated,
}: {
  detail: SupplierDetailView | null;
  loading: boolean;
  supplierId: string;
  onDetailUpdated: (supplier: SupplierDetailView) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CommercialDraft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = Boolean(supplierId?.trim());

  useEffect(() => {
    setEditing(false);
    setDraft(null);
    setSaveError(null);
  }, [detail?.id, detail?.updatedAt]);

  const startEdit = useCallback(() => {
    if (!detail) return;
    setDraft(draftFromDetail(detail));
    setSaveError(null);
    setEditing(true);
  }, [detail]);

  const save = useCallback(async () => {
    if (!detail || !draft || !supplierId.trim()) return;
    setSaveError(null);
    setIsSaving(true);
    const payload: UpdateSupplierPayload = {
      supplierType: draft.supplierType.trim() || "DISTRIBUTOR",
      alias: draft.alias.trim() ? draft.alias.trim() : undefined,
      defaultPaymentTermDays: Math.max(0, Math.round(Number(draft.termStr) || 0)),
    };
    const res = await updateSupplierAction(supplierId.trim(), payload);
    setIsSaving(false);
    if (res.success) {
      onDetailUpdated(res.supplier);
      setEditing(false);
      setDraft(null);
    } else {
      setSaveError(res.error);
    }
  }, [supplierId, detail, draft, onDetailUpdated]);

  if (loading) {
    return <LoadingState className="flex items-center justify-center py-4" />;
  }
  if (!detail) {
    return <p className="text-sm text-muted-foreground">Sin datos.</p>;
  }

  const readOnly = !editing;

  return (
    <div className="relative max-w-xl text-sm" data-test-id="supplier-detail-commercial">
      {canEdit ? (
        <div className="absolute right-0 top-0 z-[1]">
          <IconButton
            type="button"
            variant="action"
            size="sm"
            icon={editing ? "Check" : "Pencil"}
            ariaLabel={editing ? "Guardar cambios" : "Editar datos comerciales"}
            isLoading={isSaving}
            disabled={isSaving}
            onClick={() => {
              if (editing) void save();
              else startEdit();
            }}
            data-test-id={editing ? "supplier-detail-commercial-save" : "supplier-detail-commercial-edit"}
          />
        </div>
      ) : null}

      {saveError ? (
        <p className="mb-3 pr-14 text-sm text-error" role="alert">
          {saveError}
        </p>
      ) : null}

      <div className="grid gap-4 pr-0 sm:pr-12">
        {readOnly ? (
          <TextField
            label="Categoría"
            value={
              SUPPLIER_TYPE_OPTIONS.find((o) => String(o.id) === String(detail.supplierType))?.label ??
              String(detail.supplierType)
            }
            onChange={noopFieldChange}
            readOnly
            density="compact"
            data-test-id="supplier-commercial-type-readonly"
          />
        ) : (
          <Select
            label="Categoría"
            options={SUPPLIER_TYPE_OPTIONS}
            value={draft?.supplierType ?? detail.supplierType}
            onChange={(id) =>
              setDraft((d) => (d ? { ...d, supplierType: id != null ? String(id) : "DISTRIBUTOR" } : d))
            }
            disabled={!editing}
            density="compact"
            alwaysShowLabel
            data-test-id="supplier-commercial-type"
          />
        )}

        <TextField
          label="Nombre de fantasía (alias)"
          value={editing && draft ? draft.alias : detail.alias?.trim() ?? ""}
          onChange={
            readOnly ? noopFieldChange : (e) => setDraft((d) => (d ? { ...d, alias: e.target.value } : d))
          }
          readOnly={readOnly}
          density="compact"
          data-test-id="supplier-commercial-alias"
        />

        <TextField
          label="Plazo de pago (días)"
          type="number"
          min={0}
          value={editing && draft ? draft.termStr : String(detail.defaultPaymentTermDays ?? 0)}
          onChange={
            readOnly
              ? noopFieldChange
              : (e) => setDraft((d) => (d ? { ...d, termStr: e.target.value } : d))
          }
          readOnly={readOnly}
          density="compact"
          data-test-id="supplier-commercial-term"
        />

        <TextField
          label="Estado proveedor"
          value={detail.isActive ? "Activo" : "Inactivo"}
          onChange={noopFieldChange}
          readOnly
          density="compact"
          data-test-id="supplier-commercial-status"
        />
      </div>
    </div>
  );
}
