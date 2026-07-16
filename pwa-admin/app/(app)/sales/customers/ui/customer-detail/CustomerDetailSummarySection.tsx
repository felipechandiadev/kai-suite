"use client";
import { LoadingState } from "@kai/ui";

import { useCallback, useEffect, useState } from "react";
import type { PersonEconomicActivity } from "@kai/chile-catalogs";
import type { CustomerDetailView, UpdateCustomerPayload } from "@/features/sales-customers/types/customer.types";
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
import { updateCustomerAction } from "@/features/sales-customers/actions/customer.action";

const DOC_OPTIONS: Option[] = [
  { id: "RUN", label: "RUN" },
  { id: "RUT", label: "RUT" },
  { id: "PASSPORT", label: "Pasaporte" },
  { id: "DNI", label: "DNI" },
];

function normalizePersonDocumentType(raw: string | null | undefined): string {
  const u = (raw ?? "").trim().toUpperCase();
  if (u === "OTHER") return "DNI";
  return u;
}

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

function draftFromDetail(d: CustomerDetailView): Draft {
  const raw = normalizePersonDocumentType(d.documentType) || "DNI";
  const allowed = ["RUN", "RUT", "PASSPORT", "DNI"];
  const valid = allowed.includes(raw) ? raw : "DNI";
  return {
    firstName: d.firstName?.trim() ?? "",
    lastName: d.lastName?.trim() ?? "",
    businessName: d.businessName?.trim() ?? "",
    documentType: valid,
    documentNumber: d.documentNumber?.trim() ?? "",
    email: d.email?.trim() ?? "",
    phone: d.phone?.trim() ?? "",
    geo: chileGeoFromPersonFields(d),
    economicActivities: Array.isArray(d.economicActivities) ? [...d.economicActivities] : [],
  };
}

function isCompanyPerson(d: CustomerDetailView | null): boolean {
  return d?.personType?.trim().toUpperCase() === "COMPANY";
}

function buildPayload(detail: CustomerDetailView, draft: Draft): UpdateCustomerPayload {
  const docType = draft.documentType as UpdateCustomerPayload["documentType"];
  const geoFields = geoPayloadFromChileGeo(draft.geo);
  const base: UpdateCustomerPayload = {
    documentType: docType,
    documentNumber: draft.documentNumber.trim() || undefined,
    email: draft.email.trim() || undefined,
    phone: draft.phone.trim() || undefined,
    ...geoFields,
    economicActivities: draft.economicActivities,
  };
  if (isCompanyPerson(detail)) {
    return { ...base, businessName: draft.businessName.trim() || undefined };
  }
  return {
    ...base,
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim() || undefined,
  };
}

const noopFieldChange = (_e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {};

export function CustomerDetailSummarySection({
  detail,
  loading,
  customerId,
  onDetailUpdated,
}: {
  detail: CustomerDetailView | null;
  loading: boolean;
  customerId: string;
  onDetailUpdated: (customer: CustomerDetailView) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = Boolean(customerId?.trim());

  useEffect(() => {
    setEditing(false);
    setDraft(null);
    setSaveError(null);
  }, [detail?.customerId, detail?.updatedAt]);

  const startEdit = useCallback(() => {
    if (!detail) return;
    setDraft(draftFromDetail(detail));
    setSaveError(null);
    setEditing(true);
  }, [detail]);

  const save = useCallback(async () => {
    if (!detail || !draft || !customerId.trim()) return;
    if (!isCompanyPerson(detail) && !draft.firstName.trim()) {
      setSaveError("El nombre es obligatorio.");
      return;
    }
    setSaveError(null);
    setIsSaving(true);
    const payload = buildPayload(detail, draft);
    const res = await updateCustomerAction(customerId.trim(), payload);
    setIsSaving(false);
    if (res.success) {
      onDetailUpdated(res.customer);
      setEditing(false);
      setDraft(null);
    } else {
      setSaveError(res.error);
    }
  }, [customerId, detail, draft, onDetailUpdated]);

  if (loading) {
    return <LoadingState className="flex items-center justify-center py-4" />;
  }
  if (!detail) {
    return <p className="text-sm text-muted-foreground">Sin datos.</p>;
  }

  const readOnly = !editing;
  const company = isCompanyPerson(detail);
  const viewGeo = chileGeoFromPersonFields(detail);
  const viewActivities = Array.isArray(detail.economicActivities) ? detail.economicActivities : [];

  return (
    <div className="relative max-w-2xl text-sm" data-test-id="customer-detail-summary">
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
            data-test-id={editing ? "customer-detail-summary-save" : "customer-detail-summary-edit"}
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
            value={editing && draft ? draft.businessName : detail.businessName?.trim() ?? ""}
            onChange={
              readOnly
                ? noopFieldChange
                : (e) => setDraft((d) => (d ? { ...d, businessName: e.target.value } : d))
            }
            readOnly={readOnly}
            density="compact"
            data-test-id="customer-summary-business-name"
          />
        ) : (
          <>
            <TextField
              label="Nombre"
              value={editing && draft ? draft.firstName : detail.firstName?.trim() ?? ""}
              onChange={
                readOnly
                  ? noopFieldChange
                  : (e) => setDraft((d) => (d ? { ...d, firstName: e.target.value } : d))
              }
              readOnly={readOnly}
              density="compact"
              data-test-id="customer-summary-first-name"
            />
            <TextField
              label="Apellidos"
              value={editing && draft ? draft.lastName : detail.lastName?.trim() ?? ""}
              onChange={
                readOnly
                  ? noopFieldChange
                  : (e) => setDraft((d) => (d ? { ...d, lastName: e.target.value } : d))
              }
              readOnly={readOnly}
              density="compact"
              data-test-id="customer-summary-last-name"
            />
          </>
        )}

        {readOnly ? (
          <TextField
            label="Tipo de documento"
            value={documentTypeLabel(detail.documentType)}
            onChange={noopFieldChange}
            readOnly
            density="compact"
            data-test-id="customer-summary-doc-type-readonly"
          />
        ) : (
          <Select
            label="Tipo de documento"
            options={DOC_OPTIONS}
            value={draft?.documentType ?? "DNI"}
            onChange={(id) =>
              setDraft((d) => (d ? { ...d, documentType: id != null ? String(id) : "DNI" } : d))
            }
            disabled={!editing}
            density="compact"
            alwaysShowLabel
            data-test-id="customer-summary-doc-type"
          />
        )}

        <TextField
          label="Número de documento"
          value={editing && draft ? draft.documentNumber : detail.documentNumber?.trim() ?? ""}
          onChange={
            readOnly
              ? noopFieldChange
              : (e) => setDraft((d) => (d ? { ...d, documentNumber: e.target.value } : d))
          }
          readOnly={readOnly}
          density="compact"
          data-test-id="customer-summary-doc-number"
        />

        <TextField
          label="Correo"
          value={editing && draft ? draft.email : detail.email?.trim() ?? ""}
          onChange={
            readOnly ? noopFieldChange : (e) => setDraft((d) => (d ? { ...d, email: e.target.value } : d))
          }
          readOnly={readOnly}
          density="compact"
          type="email"
          data-test-id="customer-summary-email"
        />

        <TextField
          label="Teléfono"
          value={editing && draft ? draft.phone : detail.phone?.trim() ?? ""}
          onChange={
            readOnly ? noopFieldChange : (e) => setDraft((d) => (d ? { ...d, phone: e.target.value } : d))
          }
          readOnly={readOnly}
          density="compact"
          data-test-id="customer-summary-phone"
        />

        <ChileRegionCommuneFields
          value={editing && draft ? draft.geo : viewGeo}
          onChange={(next) => setDraft((d) => (d ? { ...d, geo: next } : d))}
          disabled={readOnly || isSaving}
          testIdPrefix="customer-summary-geo"
        />

        <EconomicActivitiesEditor
          value={editing && draft ? draft.economicActivities : viewActivities}
          onChange={(next) => setDraft((d) => (d ? { ...d, economicActivities: next } : d))}
          disabled={readOnly || isSaving}
          testIdPrefix="customer-summary-acteco"
        />

        <TextField
          label="Estado"
          value={detail.isActive ? "Activo" : "Inactivo"}
          onChange={noopFieldChange}
          readOnly
          density="compact"
          data-test-id="customer-summary-status"
        />
      </div>
    </div>
  );
}
