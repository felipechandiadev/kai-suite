"use client";
import { LoadingState } from "@kai/ui";

import { useCallback, useEffect, useState } from "react";
import type { PersonEconomicActivity } from "@kai/chile-catalogs";
import type {
  SupplierDetailView,
  UpdateSupplierPersonPayload,
} from "@/features/purchasing-suppliers/types/supplier.types";
import { documentTypeLabel } from "@/features/sales-customers/lib/customer-document-labels";
import { TextField } from "@kai/ui";
import { Select, type Option } from "@kai/ui";
import { IconButton } from "@kai/ui";
import { ChileRegionCommuneFields } from "@/features/chile-person/ui/ChileRegionCommuneFields";
import { EconomicActivitiesEditor } from "@/features/chile-person/ui/EconomicActivitiesEditor";
import {
  chileGeoFromPersonFields,
  geoPayloadFromChileGeo,
} from "@/features/chile-person/lib/person-geo-payload.util";
import type { ChileGeoValue } from "@/features/chile-person/ui/ChileRegionCommuneFields";
import { updateSupplierAction } from "@/features/purchasing-suppliers/actions/supplier.action";

const DOC_OPTIONS_NATURAL: Option[] = [
  { id: "RUN", label: "RUN" },
  { id: "PASSPORT", label: "Pasaporte" },
  { id: "DNI", label: "DNI" },
];

const DOC_OPTIONS_COMPANY: Option[] = [
  { id: "RUN", label: "RUN" },
  { id: "RUT", label: "RUT" },
  { id: "PASSPORT", label: "Pasaporte" },
  { id: "DNI", label: "DNI" },
];

type Draft = {
  firstName: string;
  lastName: string;
  businessName: string;
  documentType: string;
  documentNumber: string;
  email: string;
  phone: string;
  geo: ChileGeoValue;
  economicActivities: PersonEconomicActivity[];
};

function normalizePersonDocType(raw: string | null | undefined, emptyFallback: string): string {
  const u = (raw ?? "").trim().toUpperCase();
  if (!u) return emptyFallback;
  return u === "OTHER" ? "DNI" : u;
}

function draftFromPerson(p: NonNullable<SupplierDetailView["person"]>): Draft {
  const raw = normalizePersonDocType(p.documentType, "DNI");
  const allowed =
    p.type === "COMPANY" ? ["RUN", "RUT", "PASSPORT", "DNI"] : ["RUN", "PASSPORT", "DNI"];
  const valid = allowed.includes(raw) ? raw : p.type === "COMPANY" ? "RUT" : "DNI";
  return {
    firstName: p.firstName?.trim() ?? "",
    lastName: p.lastName?.trim() ?? "",
    businessName: p.businessName?.trim() ?? "",
    documentType: valid,
    documentNumber: p.documentNumber?.trim() ?? "",
    email: p.email?.trim() ?? "",
    phone: p.phone?.trim() ?? "",
    geo: chileGeoFromPersonFields(p),
    economicActivities: Array.isArray(p.economicActivities) ? [...p.economicActivities] : [],
  };
}

function isCompany(detail: SupplierDetailView | null): boolean {
  return detail?.person?.type === "COMPANY";
}

function buildPersonPayload(detail: SupplierDetailView, draft: Draft): UpdateSupplierPersonPayload {
  const docType = draft.documentType;
  const geoFields = geoPayloadFromChileGeo(draft.geo);
  const base: UpdateSupplierPersonPayload = {
    documentType: docType,
    documentNumber: draft.documentNumber.trim() || undefined,
    email: draft.email.trim() || undefined,
    phone: draft.phone.trim() || undefined,
    ...geoFields,
    economicActivities: draft.economicActivities,
  };
  if (isCompany(detail)) {
    return { ...base, businessName: draft.businessName.trim() || undefined };
  }
  return {
    ...base,
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim() || undefined,
  };
}

const noopFieldChange = (_e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {};

export function SupplierDetailSummarySection({
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
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = Boolean(supplierId?.trim());

  useEffect(() => {
    setEditing(false);
    setDraft(null);
    setSaveError(null);
  }, [detail?.id, detail?.updatedAt]);

  const startEdit = useCallback(() => {
    if (!detail?.person) return;
    setDraft(draftFromPerson(detail.person));
    setSaveError(null);
    setEditing(true);
  }, [detail]);

  const save = useCallback(async () => {
    if (!detail?.person || !draft || !supplierId.trim()) return;
    if (!isCompany(detail) && !draft.firstName.trim()) {
      setSaveError("El nombre es obligatorio.");
      return;
    }
    setSaveError(null);
    setIsSaving(true);
    const person = buildPersonPayload(detail, draft);
    const res = await updateSupplierAction(supplierId.trim(), { person });
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
  if (!detail.person) {
    return <p className="text-sm text-muted-foreground">Sin persona asociada.</p>;
  }

  const readOnly = !editing;
  const company = isCompany(detail);
  const p = detail.person;
  const docOptions = company ? DOC_OPTIONS_COMPANY : DOC_OPTIONS_NATURAL;
  const viewGeo = chileGeoFromPersonFields(p);
  const viewActivities = Array.isArray(p.economicActivities) ? p.economicActivities : [];

  return (
    <div className="relative max-w-2xl text-sm" data-test-id="supplier-detail-summary">
      {canEdit ? (
        <div className="absolute right-0 top-0 z-[1]">
          <IconButton
            type="button"
            variant="action"
            size="sm"
            icon={editing ? "Check" : "Pencil"}
            ariaLabel={editing ? "Guardar cambios" : "Editar datos"}
            isLoading={isSaving}
            disabled={isSaving}
            onClick={() => {
              if (editing) void save();
              else startEdit();
            }}
            data-test-id={editing ? "supplier-detail-summary-save" : "supplier-detail-summary-edit"}
          />
        </div>
      ) : null}

      {saveError ? (
        <p className="mb-3 pr-14 text-sm text-error" role="alert">
          {saveError}
        </p>
      ) : null}

      <div className="grid gap-4 pr-0 sm:pr-12">
        {company ? (
          <TextField
            label="Razón social"
            value={editing && draft ? draft.businessName : p.businessName?.trim() ?? ""}
            onChange={
              readOnly
                ? noopFieldChange
                : (e) => setDraft((d) => (d ? { ...d, businessName: e.target.value } : d))
            }
            readOnly={readOnly}
            density="compact"
            data-test-id="supplier-summary-business-name"
          />
        ) : (
          <>
            <TextField
              label="Nombre"
              value={editing && draft ? draft.firstName : p.firstName?.trim() ?? ""}
              onChange={
                readOnly
                  ? noopFieldChange
                  : (e) => setDraft((d) => (d ? { ...d, firstName: e.target.value } : d))
              }
              readOnly={readOnly}
              density="compact"
              data-test-id="supplier-summary-first-name"
            />
            <TextField
              label="Apellidos"
              value={editing && draft ? draft.lastName : p.lastName?.trim() ?? ""}
              onChange={
                readOnly
                  ? noopFieldChange
                  : (e) => setDraft((d) => (d ? { ...d, lastName: e.target.value } : d))
              }
              readOnly={readOnly}
              density="compact"
              data-test-id="supplier-summary-last-name"
            />
          </>
        )}

        {readOnly ? (
          <TextField
            label="Tipo de documento"
            value={documentTypeLabel(p.documentType)}
            onChange={noopFieldChange}
            readOnly
            density="compact"
            data-test-id="supplier-summary-doc-type-readonly"
          />
        ) : (
          <Select
            label="Tipo de documento"
            options={docOptions}
            value={draft?.documentType ?? "DNI"}
            onChange={(id) =>
              setDraft((d) => (d ? { ...d, documentType: id != null ? String(id) : "DNI" } : d))
            }
            disabled={!editing}
            density="compact"
            alwaysShowLabel
            data-test-id="supplier-summary-doc-type"
          />
        )}

        <TextField
          label="Número de documento"
          value={editing && draft ? draft.documentNumber : p.documentNumber?.trim() ?? ""}
          onChange={
            readOnly
              ? noopFieldChange
              : (e) => setDraft((d) => (d ? { ...d, documentNumber: e.target.value } : d))
          }
          readOnly={readOnly}
          density="compact"
          data-test-id="supplier-summary-doc-number"
        />

        <TextField
          label="Correo"
          value={editing && draft ? draft.email : p.email?.trim() ?? ""}
          onChange={
            readOnly ? noopFieldChange : (e) => setDraft((d) => (d ? { ...d, email: e.target.value } : d))
          }
          readOnly={readOnly}
          density="compact"
          type="email"
          data-test-id="supplier-summary-email"
        />

        <TextField
          label="Teléfono"
          value={editing && draft ? draft.phone : p.phone?.trim() ?? ""}
          onChange={
            readOnly ? noopFieldChange : (e) => setDraft((d) => (d ? { ...d, phone: e.target.value } : d))
          }
          readOnly={readOnly}
          density="compact"
          data-test-id="supplier-summary-phone"
        />

        <ChileRegionCommuneFields
          value={editing && draft ? draft.geo : viewGeo}
          onChange={(next) => setDraft((d) => (d ? { ...d, geo: next } : d))}
          disabled={readOnly || isSaving}
          testIdPrefix="supplier-summary-geo"
        />

        <EconomicActivitiesEditor
          value={editing && draft ? draft.economicActivities : viewActivities}
          onChange={(next) => setDraft((d) => (d ? { ...d, economicActivities: next } : d))}
          disabled={readOnly || isSaving}
          testIdPrefix="supplier-summary-acteco"
        />

        <TextField
          label="Estado proveedor"
          value={detail.isActive ? "Activo" : "Inactivo"}
          onChange={noopFieldChange}
          readOnly
          density="compact"
          data-test-id="supplier-summary-status"
        />
      </div>
    </div>
  );
}
