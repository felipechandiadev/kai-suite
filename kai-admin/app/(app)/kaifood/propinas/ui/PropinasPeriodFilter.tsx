"use client";

import { Select, TextField } from "@kai/ui";
import {
  DATE_PRESET_OPTIONS,
  dateRangeForPreset,
  type DatePreset,
} from "@/shared/reports/report-dates";

export type PropinasPeriodValue = {
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
};

export function defaultPropinasPeriod(): PropinasPeriodValue {
  const range = dateRangeForPreset("month");
  return {
    datePreset: "month",
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
  };
}

type Props = {
  value: PropinasPeriodValue;
  onChange: (next: PropinasPeriodValue) => void;
};

export function PropinasPeriodFilter({ value, onChange }: Props) {
  return (
    <div
      className="flex flex-wrap items-end gap-3"
      data-test-id="kaifood-propinas-period-filter"
    >
      <Select
        label="Período rápido"
        alwaysShowLabel
        options={DATE_PRESET_OPTIONS}
        value={value.datePreset}
        onChange={(id) => {
          const preset = String(id ?? "custom") as DatePreset;
          if (preset === "custom") {
            onChange({ ...value, datePreset: "custom" });
            return;
          }
          const range = dateRangeForPreset(preset);
          onChange({
            datePreset: preset,
            dateFrom: range.dateFrom,
            dateTo: range.dateTo,
          });
        }}
      />
      <TextField
        label="Desde"
        type="date"
        alwaysShowLabel
        value={value.dateFrom}
        onChange={(e) =>
          onChange({
            ...value,
            datePreset: "custom",
            dateFrom: e.target.value || value.dateFrom,
          })
        }
      />
      <TextField
        label="Hasta"
        type="date"
        alwaysShowLabel
        value={value.dateTo}
        onChange={(e) =>
          onChange({
            ...value,
            datePreset: "custom",
            dateTo: e.target.value || value.dateTo,
          })
        }
      />
    </div>
  );
}
