"use client";

import { useCallback, useMemo } from "react";
import { SelectDefault as Select, TextField } from "@kai/ui";
import type { ReportRegistryEntry } from "@/features/hcm-reports/types/hcm-report.types";
import {
  DATE_PRESET_OPTIONS,
  dateRangeForPreset,
  type DatePreset,
} from "@/shared/reports/report-dates";
import type { ReportFormState } from "@/features/hcm-reports/lib/report-form";

type LaborUnitOpt = { id: string; name: string };
type EmployeeOpt = { id: string; label: string; laborUnitId?: string | null };

type Props = {
  entry: ReportRegistryEntry;
  value: ReportFormState;
  onChange: (next: ReportFormState) => void;
  laborUnits: LaborUnitOpt[];
  employees: EmployeeOpt[];
};

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

export function ReportParamsForm({
  entry,
  value,
  onChange,
  laborUnits,
  employees,
}: Props) {
  const kinds = useMemo(() => new Set(entry.params.map((p) => p.kind)), [entry]);

  const patch = useCallback(
    (partial: Partial<ReportFormState>) => onChange({ ...value, ...partial }),
    [onChange, value],
  );

  const filteredEmployees = useMemo(() => {
    if (!value.laborUnitId) return employees;
    return employees.filter((e) => e.laborUnitId === value.laborUnitId);
  }, [employees, value.laborUnitId]);

  return (
    <div className="flex flex-col gap-3" data-test-id="hcm-report-params-form">
      {kinds.has("dateRange") ? (
        <div className="flex flex-col gap-2">
          <Select
            label="Período"
            alwaysShowLabel
            options={DATE_PRESET_OPTIONS}
            value={value.datePreset}
            onChange={(id) => {
              const preset = String(id ?? "month") as DatePreset;
              if (preset === "custom") {
                patch({ datePreset: preset });
                return;
              }
              const range = dateRangeForPreset(preset);
              patch({
                datePreset: preset,
                dateFrom: range.dateFrom,
                dateTo: range.dateTo,
              });
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            <TextField
              label="Desde"
              type="date"
              value={value.dateFrom}
              onChange={(e) =>
                patch({
                  datePreset: "custom",
                  dateFrom: e.target.value,
                })
              }
            />
            <TextField
              label="Hasta"
              type="date"
              value={value.dateTo}
              onChange={(e) =>
                patch({
                  datePreset: "custom",
                  dateTo: e.target.value,
                })
              }
            />
          </div>
        </div>
      ) : null}

      {kinds.has("laborUnit") ? (
        <Select
          label="Unidad laboral"
          alwaysShowLabel
          options={[
            { id: "", label: "Todas" },
            ...laborUnits.map((u) => ({ id: u.id, label: u.name })),
          ]}
          value={value.laborUnitId ?? ""}
          onChange={(id) => {
            const next = id ? String(id) : null;
            patch({
              laborUnitId: next,
              employeeIds: [],
            });
          }}
        />
      ) : null}

      {kinds.has("employeeMulti") ? (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
          <p className="text-xs font-medium text-muted-foreground">Empleados</p>
          {filteredEmployees.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin empleados</p>
          ) : (
            filteredEmployees.map((e) => (
              <label
                key={e.id}
                className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
              >
                <input
                  type="checkbox"
                  checked={value.employeeIds.includes(e.id)}
                  onChange={() =>
                    patch({ employeeIds: toggleId(value.employeeIds, e.id) })
                  }
                />
                <span className="truncate">{e.label}</span>
              </label>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
