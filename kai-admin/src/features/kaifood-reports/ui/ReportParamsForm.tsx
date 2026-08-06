"use client";

import { useMemo } from "react";
import { SelectDefault as Select, TextField } from "@kai/ui";
import type { ReportRegistryEntry } from "@/features/kaifood-reports/types/kaifood-report.types";
import {
  DATE_PRESET_OPTIONS,
  dateRangeForPreset,
  type CompareWith,
  type DatePreset,
  type ReportGranularity,
  toIsoDate,
} from "@/shared/reports";
import { type ReportFormState } from "@/features/kaifood-reports/lib/report-form";

const GRANULARITY_OPTIONS: Array<{ id: ReportGranularity; label: string }> = [
  { id: "auto", label: "Automática" },
  { id: "day", label: "Día" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
];

const COMPARE_OPTIONS: Array<{ id: CompareWith; label: string }> = [
  { id: "none", label: "Sin comparación" },
  { id: "previousPeriod", label: "Período anterior" },
  { id: "samePeriodLastYear", label: "Mismo lapso año pasado" },
];

const ORDER_KIND_OPTIONS = [
  { id: "", label: "Todos" },
  { id: "TABLE", label: "Mesas" },
  { id: "COUNTER", label: "Barra" },
  { id: "TAKEAWAY", label: "Para llevar" },
];

type Props = {
  entry: ReportRegistryEntry;
  value: ReportFormState;
  onChange: (next: ReportFormState) => void;
  branches: Array<{ id: string; label: string }>;
  diningRooms: Array<{ id: string; label: string; branchId: string }>;
};

export function ReportParamsForm({
  entry,
  value,
  onChange,
  branches,
  diningRooms,
}: Props) {
  const kinds = useMemo(() => new Set(entry.params.map((p) => p.kind)), [entry]);

  const patch = (partial: Partial<ReportFormState>) =>
    onChange({ ...value, ...partial });

  const roomOptions = useMemo(() => {
    const filtered = value.branchId
      ? diningRooms.filter((r) => r.branchId === value.branchId)
      : diningRooms;
    return [{ id: "", label: "Todos" }, ...filtered.map((r) => ({ id: r.id, label: r.label }))];
  }, [diningRooms, value.branchId]);

  const compareOptions =
    entry.id === "dining-period-compare"
      ? COMPARE_OPTIONS.filter((o) => o.id !== "none")
      : COMPARE_OPTIONS;

  return (
    <div className="space-y-3" data-test-id="kaifood-report-params-form">
      {kinds.has("dateRange") ? (
        <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
          <p className="text-xs font-medium text-foreground">Período</p>
          <Select
            label="Período rápido"
            alwaysShowLabel
            options={DATE_PRESET_OPTIONS}
            value={value.datePreset}
            onChange={(id) => {
              const preset = String(id ?? "custom") as DatePreset;
              if (preset === "custom") {
                patch({ datePreset: "custom" });
                return;
              }
              const range = dateRangeForPreset(preset);
              patch({ datePreset: preset, ...range });
            }}
          />
          <div className="flex flex-col gap-2">
            <TextField
              label="Desde"
              type="date"
              alwaysShowLabel
              value={value.dateFrom}
              onChange={(e) =>
                patch({
                  datePreset: "custom",
                  dateFrom: e.target.value || toIsoDate(new Date()),
                })
              }
            />
            <TextField
              label="Hasta"
              type="date"
              alwaysShowLabel
              value={value.dateTo}
              onChange={(e) =>
                patch({
                  datePreset: "custom",
                  dateTo: e.target.value || toIsoDate(new Date()),
                })
              }
            />
          </div>
        </div>
      ) : null}

      {(kinds.has("branch") ||
        kinds.has("diningRoom") ||
        kinds.has("orderKind") ||
        kinds.has("granularity") ||
        kinds.has("compareWith")) && (
        <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
          <p className="text-xs font-medium text-foreground">Alcance y análisis</p>
          {kinds.has("branch") ? (
            <Select
              label="Sucursal"
              alwaysShowLabel
              options={[{ id: "", label: "Todas" }, ...branches]}
              value={value.branchId}
              onChange={(id) =>
                patch({
                  branchId: String(id ?? ""),
                  diningRoomId: "",
                })
              }
            />
          ) : null}
          {kinds.has("diningRoom") ? (
            <Select
              label="Salón"
              alwaysShowLabel
              options={roomOptions}
              value={value.diningRoomId}
              onChange={(id) => patch({ diningRoomId: String(id ?? "") })}
            />
          ) : null}
          {kinds.has("orderKind") ? (
            <Select
              label="Tipo de cuenta"
              alwaysShowLabel
              options={ORDER_KIND_OPTIONS}
              value={value.orderKind}
              onChange={(id) => patch({ orderKind: String(id ?? "") })}
            />
          ) : null}
          {kinds.has("granularity") ? (
            <Select
              label="Granularidad"
              alwaysShowLabel
              options={GRANULARITY_OPTIONS}
              value={value.granularity}
              onChange={(id) =>
                patch({
                  granularity: String(id ?? "auto") as ReportGranularity,
                })
              }
            />
          ) : null}
          {kinds.has("compareWith") ? (
            <Select
              label="Comparar con"
              alwaysShowLabel
              options={compareOptions}
              value={
                entry.id === "dining-period-compare" && value.compareWith === "none"
                  ? "previousPeriod"
                  : value.compareWith
              }
              onChange={(id) =>
                patch({ compareWith: String(id ?? "none") as CompareWith })
              }
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
