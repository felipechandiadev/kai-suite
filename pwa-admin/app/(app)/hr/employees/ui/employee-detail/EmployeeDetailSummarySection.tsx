"use client";

import { useCallback, useEffect, useState } from "react";
import { IconButton, LoadingState, Select, TextField, type Option } from "@kai/ui";
import type { EmployeeDetailView, UpdateEmployeePersonPayload } from "@/features/hr-employees/types/employee.types";
import { documentTypeLabel } from "@/features/sales-customers/lib/customer-document-labels";
import { updateEmployeePersonAction } from "@/features/hr-employees/actions/employee.action";

const DOC_OPTIONS: Option[] = [
  { id: "RUN", label: "RUN" },
  { id: "PASSPORT", label: "Pasaporte" },
  { id: "DNI", label: "DNI" },
];

type Draft = {
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  email: string;
  phone: string;
  address: string;
};

function normalizePersonDocType(raw: string | null | undefined): string {
  const u = (raw ?? "").trim().toUpperCase();
  if (!u) return "DNI";
  return u === "OTHER" ? "DNI" : u;
}

function draftFromPerson(p: NonNullable<EmployeeDetailView["person"]>): Draft {
  const raw = normalizePersonDocType(p.documentType);
  const allowed = ["RUN", "PASSPORT", "DNI"];
  const valid = allowed.includes(raw) ? raw : "DNI";
  return {
    firstName: p.firstName?.trim() ?? "",
    lastName: p.lastName?.trim() ?? "",
    documentType: valid,
    documentNumber: p.documentNumber?.trim() ?? "",
    email: p.email?.trim() ?? "",
    phone: p.phone?.trim() ?? "",
    address: p.address?.trim() ?? "",
  };
}

function buildPersonPayload(draft: Draft): UpdateEmployeePersonPayload {
  return {
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim() || undefined,
    documentType: draft.documentType as UpdateEmployeePersonPayload["documentType"],
    documentNumber: draft.documentNumber.trim() || undefined,
    email: draft.email.trim() || undefined,
    phone: draft.phone.trim() || undefined,
    address: draft.address.trim() || undefined,
  };
}

const noopFieldChange = (_e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {};

export function EmployeeDetailSummarySection({
  detail,
  loading,
  employeeId,
  onDetailUpdated,
}: {
  detail: EmployeeDetailView | null;
  loading: boolean;
  employeeId: string;
  onDetailUpdated: (employee: EmployeeDetailView) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = Boolean(employeeId?.trim() && detail?.personId);

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
    if (!detail?.person || !draft || !employeeId.trim() || !detail.personId) return;
    if (!draft.firstName.trim()) {
      setSaveError("El nombre es obligatorio.");
      return;
    }
    setSaveError(null);
    setIsSaving(true);
    const res = await updateEmployeePersonAction(
      detail.personId,
      employeeId.trim(),
      buildPersonPayload(draft),
    );
    setIsSaving(false);
    if (res.success) {
      onDetailUpdated(res.employee);
      setEditing(false);
      setDraft(null);
    } else {
      setSaveError(res.error);
    }
  }, [employeeId, detail, draft, onDetailUpdated]);

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
  const p = detail.person;

  return (
    <div className="relative max-w-2xl text-sm" data-test-id="employee-detail-summary">
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
            data-test-id={editing ? "employee-detail-summary-save" : "employee-detail-summary-edit"}
          />
        </div>
      ) : null}

      {saveError ? (
        <p className="mb-3 pr-14 text-sm text-error" role="alert">
          {saveError}
        </p>
      ) : null}

      <div className="grid gap-4 pr-0 sm:pr-12">
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
          data-test-id="employee-summary-first-name"
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
          data-test-id="employee-summary-last-name"
        />

        {readOnly ? (
          <TextField
            label="Tipo de documento"
            value={documentTypeLabel(p.documentType)}
            onChange={noopFieldChange}
            readOnly
            density="compact"
            data-test-id="employee-summary-doc-type-readonly"
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
            data-test-id="employee-summary-doc-type"
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
          data-test-id="employee-summary-doc-number"
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
          data-test-id="employee-summary-email"
        />

        <TextField
          label="Teléfono"
          value={editing && draft ? draft.phone : p.phone?.trim() ?? ""}
          onChange={
            readOnly ? noopFieldChange : (e) => setDraft((d) => (d ? { ...d, phone: e.target.value } : d))
          }
          readOnly={readOnly}
          density="compact"
          data-test-id="employee-summary-phone"
        />

        <TextField
          label="Dirección"
          value={editing && draft ? draft.address : p.address?.trim() ?? ""}
          onChange={
            readOnly ? noopFieldChange : (e) => setDraft((d) => (d ? { ...d, address: e.target.value } : d))
          }
          readOnly={readOnly}
          density="compact"
          rows={2}
          data-test-id="employee-summary-address"
        />
      </div>
    </div>
  );
}
