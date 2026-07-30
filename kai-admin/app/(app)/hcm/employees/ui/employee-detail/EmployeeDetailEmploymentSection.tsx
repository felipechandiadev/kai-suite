"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconButton, LoadingState, Select, TextField, type Option } from "@kai/ui";
import {
  listOrganizationalUnitsAction,
} from "@/features/hr-organizational-units/actions/organizational-unit.action";
import type { OrganizationalUnitListItem } from "@/features/hr-organizational-units/types/organizational-unit.types";
import {
  listResultCentersForEmployeeAction,
  updateEmployeeAction,
} from "@/features/hr-employees/actions/employee.action";
import type {
  EmployeeDetailView,
  ResultCenterListItem,
  UpdateEmployeePayload,
} from "@/features/hr-employees/types/employee.types";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import {
  EMPLOYEE_EMPLOYMENT_LABEL,
  EMPLOYEE_STATUS_LABEL,
  formatDateOnlySlash,
  formatMoneyClp,
} from "./employee-detail-labels";
import { employeeSectionCardClass } from "./employee-section-card";

const EMPLOYMENT_TYPE_OPTIONS: Option[] = [
  { id: "FULL_TIME", label: "Jornada completa" },
  { id: "PART_TIME", label: "Part time" },
  { id: "CONTRACTOR", label: "Contratista" },
  { id: "TEMPORARY", label: "Temporal" },
  { id: "INTERN", label: "Práctica" },
];

const WORK_REGIME_LABEL: Record<string, string> = {
  ORDINARY: "Ordinaria",
  PARTIAL: "Parcial",
  EXCEPTIONAL_ART38: "Excepcional (Art. 38)",
};

const STATUS_OPTIONS: Option[] = [
  { id: "ACTIVE", label: "Activo" },
  { id: "SUSPENDED", label: "Suspendido" },
  { id: "TERMINATED", label: "Terminado" },
];

type EmploymentDraft = {
  branchId: string | null;
  resultCenterId: string | null;
  organizationalUnitId: string | null;
  laborUnitId: string | null;
  employmentType: string;
  status: string;
  terminationDate: string;
};

function draftFromDetail(d: EmployeeDetailView): EmploymentDraft {
  return {
    branchId: d.branchId?.trim() || d.branch?.id || null,
    resultCenterId: d.resultCenterId?.trim() || d.resultCenter?.id || null,
    organizationalUnitId: d.organizationalUnitId?.trim() || d.organizationalUnit?.id || null,
    laborUnitId: d.laborUnitId?.trim() || null,
    employmentType: d.employmentType?.trim() || "FULL_TIME",
    status: d.status?.trim() || "ACTIVE",
    terminationDate: d.terminationDate?.trim()?.slice(0, 10) ?? "",
  };
}

const noopFieldChange = (_e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {};

export function EmployeeDetailEmploymentSection({
  detail,
  loading,
  employeeId,
  branches,
  laborUnits = [],
  onDetailUpdated,
  onGoToContract,
}: {
  detail: EmployeeDetailView | null;
  loading: boolean;
  employeeId: string;
  branches: BranchListItem[];
  laborUnits?: Array<{ id: string; name: string; code?: string }>;
  onDetailUpdated: (employee: EmployeeDetailView) => void;
  onGoToContract?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EmploymentDraft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [resultCenters, setResultCenters] = useState<ResultCenterListItem[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrganizationalUnitListItem[]>([]);
  const [refsLoading, setRefsLoading] = useState(true);

  const canEdit = Boolean(employeeId?.trim());

  const branchOptions: Option[] = useMemo(
    () => [
      { id: "", label: "— Sin sucursal —" },
      ...branches
        .filter((b) => b.isActive !== false)
        .map((b) => ({ id: b.id, label: b.name })),
    ],
    [branches],
  );

  const resultCenterOptions: Option[] = useMemo(
    () => [
      { id: "", label: "— Sin centro —" },
      ...resultCenters.map((rc) => ({
        id: rc.id,
        label: rc.code?.trim() ? `${rc.name} (${rc.code})` : rc.name,
      })),
    ],
    [resultCenters],
  );

  const orgUnitOptions: Option[] = useMemo(
    () => [
      { id: "", label: "— Sin unidad —" },
      ...orgUnits.map((u) => ({ id: u.id, label: u.name })),
    ],
    [orgUnits],
  );

  useEffect(() => {
    let cancelled = false;
    setRefsLoading(true);
    void Promise.all([
      listResultCentersForEmployeeAction(),
      listOrganizationalUnitsAction(),
    ]).then(([rc, ou]) => {
      if (cancelled) return;
      setResultCenters(rc);
      setOrgUnits(ou);
      setRefsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (!detail || !draft || !employeeId.trim()) return;
    if (!draft.laborUnitId?.trim()) {
      setSaveError("La unidad laboral es obligatoria.");
      return;
    }
    if (draft.status === "TERMINATED" && !draft.terminationDate.trim()) {
      setSaveError("Indique la fecha de término para empleados terminados.");
      return;
    }
    setSaveError(null);
    setIsSaving(true);

    const payload: UpdateEmployeePayload = {
      branchId: draft.branchId?.trim() || null,
      resultCenterId: draft.resultCenterId?.trim() || null,
      organizationalUnitId: draft.organizationalUnitId?.trim() || null,
      laborUnitId: draft.laborUnitId.trim(),
      employmentType: draft.employmentType.trim() || "FULL_TIME",
      status: draft.status.trim() || "ACTIVE",
      terminationDate:
        draft.status === "TERMINATED"
          ? draft.terminationDate.trim() || null
          : null,
    };

    const res = await updateEmployeeAction(employeeId.trim(), payload);
    setIsSaving(false);
    if (res.success) {
      onDetailUpdated(res.employee);
      setEditing(false);
      setDraft(null);
    } else {
      setSaveError(res.error);
    }
  }, [employeeId, detail, draft, onDetailUpdated]);

  if (loading || refsLoading) {
    return <LoadingState className="flex items-center justify-center py-4" />;
  }
  if (!detail) {
    return <p className="text-sm text-muted-foreground">Sin datos.</p>;
  }

  const readOnly = !editing;
  const statusKey = editing && draft ? draft.status : String(detail.status || "");
  const showTermination = statusKey === "TERMINATED";

  return (
    <section
      className={employeeSectionCardClass(editing)}
      data-test-id="employee-detail-employment"
    >
      <h2 className="pr-10 text-sm font-semibold text-foreground">Organización</h2>
      <p className="pr-10 text-xs text-muted-foreground">
        Sucursal, estructura y estado. Sueldo y régimen se definen en Contrato.
      </p>

      {canEdit ? (
        <div className="absolute right-3 top-3 z-[1]">
          <IconButton
            type="button"
            variant="action"
            size="sm"
            icon={editing ? "Check" : "Pencil"}
            ariaLabel={editing ? "Guardar cambios" : "Editar datos laborales"}
            isLoading={isSaving}
            disabled={isSaving}
            onClick={() => {
              if (editing) void save();
              else startEdit();
            }}
            data-test-id={editing ? "employee-detail-employment-save" : "employee-detail-employment-edit"}
          />
        </div>
      ) : null}

      {saveError ? (
        <p className="mb-3 pr-14 text-sm text-error" role="alert">
          {saveError}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Empresa"
          value={detail.company?.name?.trim() ?? "—"}
          onChange={noopFieldChange}
          readOnly
          data-test-id="employee-employment-company"
        />

        {readOnly ? (
          <TextField
            label="Sucursal"
            value={detail.branch?.name?.trim() ?? "—"}
            onChange={noopFieldChange}
            readOnly
            data-test-id="employee-employment-branch-readonly"
          />
        ) : (
          <Select
            label="Sucursal"
            options={branchOptions}
            value={draft?.branchId ?? ""}
            onChange={(id) =>
              setDraft((d) =>
                d ? { ...d, branchId: id != null && String(id) !== "" ? String(id) : null } : d,
              )
            }
            disabled={!editing}
            alwaysShowLabel
            data-test-id="employee-employment-branch"
          />
        )}

        {readOnly ? (
          <TextField
            label="Centro de resultado"
            value={detail.resultCenter?.name?.trim() ?? "—"}
            onChange={noopFieldChange}
            readOnly
            data-test-id="employee-employment-result-center-readonly"
          />
        ) : (
          <Select
            label="Centro de resultado"
            options={resultCenterOptions}
            value={draft?.resultCenterId ?? ""}
            onChange={(id) =>
              setDraft((d) =>
                d
                  ? { ...d, resultCenterId: id != null && String(id) !== "" ? String(id) : null }
                  : d,
              )
            }
            disabled={!editing}
            alwaysShowLabel
            data-test-id="employee-employment-result-center"
          />
        )}

        {readOnly ? (
          <TextField
            label="Unidad organizativa"
            value={detail.organizationalUnit?.name?.trim() ?? "—"}
            onChange={noopFieldChange}
            readOnly
            data-test-id="employee-employment-org-unit-readonly"
          />
        ) : (
          <Select
            label="Unidad organizativa"
            options={orgUnitOptions}
            value={draft?.organizationalUnitId ?? ""}
            onChange={(id) =>
              setDraft((d) =>
                d
                  ? {
                      ...d,
                      organizationalUnitId: id != null && String(id) !== "" ? String(id) : null,
                    }
                  : d,
              )
            }
            disabled={!editing}
            alwaysShowLabel
            data-test-id="employee-employment-org-unit"
          />
        )}

        {readOnly ? (
          <TextField
            label="Unidad laboral"
            value={
              laborUnits.find((u) => u.id === detail.laborUnitId)?.name?.trim() ||
              detail.laborUnitId ||
              "—"
            }
            onChange={noopFieldChange}
            readOnly
            data-test-id="employee-employment-labor-unit-readonly"
          />
        ) : (
          <Select
            label="Unidad laboral"
            options={laborUnits.map((u) => ({
              id: u.id,
              label: u.code ? `${u.name} (${u.code})` : u.name,
            }))}
            value={draft?.laborUnitId ?? ""}
            onChange={(id) =>
              setDraft((d) =>
                d
                  ? {
                      ...d,
                      laborUnitId:
                        id != null && String(id) !== "" ? String(id) : d.laborUnitId,
                    }
                  : d,
              )
            }
            disabled={!editing}
            alwaysShowLabel
            required
            data-test-id="employee-employment-labor-unit"
          />
        )}

        {readOnly ? (
          <TextField
            label="Tipo de contrato"
            value={EMPLOYEE_EMPLOYMENT_LABEL[String(detail.employmentType)] ?? detail.employmentType ?? "—"}
            onChange={noopFieldChange}
            readOnly
            data-test-id="employee-employment-type-readonly"
          />
        ) : (
          <Select
            label="Tipo de contrato"
            options={EMPLOYMENT_TYPE_OPTIONS}
            value={draft?.employmentType ?? detail.employmentType}
            onChange={(id) =>
              setDraft((d) =>
                d ? { ...d, employmentType: id != null ? String(id) : "FULL_TIME" } : d,
              )
            }
            disabled={!editing}
            alwaysShowLabel
            data-test-id="employee-employment-type"
          />
        )}

        {readOnly ? (
          <TextField
            label="Estado laboral"
            value={EMPLOYEE_STATUS_LABEL[String(detail.status)] ?? detail.status ?? "—"}
            onChange={noopFieldChange}
            readOnly
            data-test-id="employee-employment-status-readonly"
          />
        ) : (
          <Select
            label="Estado laboral"
            options={STATUS_OPTIONS}
            value={draft?.status ?? detail.status}
            onChange={(id) =>
              setDraft((d) => (d ? { ...d, status: id != null ? String(id) : "ACTIVE" } : d))
            }
            disabled={!editing}
            alwaysShowLabel
            data-test-id="employee-employment-status"
          />
        )}

        <TextField
          label="Fecha de ingreso"
          value={formatDateOnlySlash(detail.hireDate)}
          onChange={noopFieldChange}
          readOnly
          data-test-id="employee-employment-hire-date"
        />

        {showTermination || (editing && draft?.status === "TERMINATED") ? (
          <TextField
            label="Fecha de término"
            type={editing ? "date" : "text"}
            value={
              editing && draft
                ? draft.terminationDate
                : formatDateOnlySlash(detail.terminationDate)
            }
            onChange={
              readOnly
                ? noopFieldChange
                : (e) => setDraft((d) => (d ? { ...d, terminationDate: e.target.value } : d))
            }
            readOnly={readOnly}
            data-test-id="employee-employment-termination-date"
          />
        ) : null}

        <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted/15 p-3 sm:col-span-2">
          <p className="text-xs font-medium text-foreground">Desde contrato activo</p>
          <p className="text-[11px] text-muted-foreground">
            Sueldo y régimen se editan en la sección Contrato.
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <TextField
              label="Régimen laboral"
              value={WORK_REGIME_LABEL[String(detail.workRegime)] ?? detail.workRegime ?? "Ordinaria"}
              onChange={noopFieldChange}
              readOnly
              data-test-id="employee-work-regime-readonly"
            />
            <TextField
              label="Sueldo / honorario"
              value={formatMoneyClp(detail.baseSalary)}
              onChange={noopFieldChange}
              readOnly
              data-test-id="employee-employment-base-salary"
            />
          </div>
          {onGoToContract ? (
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={onGoToContract}
              data-test-id="employee-employment-goto-contract"
            >
              Editar en Contrato →
            </button>
          ) : null}
        </div>

        {detail.createdAt ? (
          <div className="sm:col-span-2">
            <TextField
              label="Registrado"
              value={formatDateOnlySlash(detail.createdAt)}
              onChange={noopFieldChange}
              readOnly
              data-test-id="employee-employment-created-at"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
