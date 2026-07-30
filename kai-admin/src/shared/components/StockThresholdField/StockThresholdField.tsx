"use client";

import { TextField } from "@kai/ui";
import { Switch } from "@kai/ui";

export type StockThresholdFieldProps = {
  label: string;
  name: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  dataTestId?: string;
};

export function formatThresholdReadOnly(
  enabled: boolean | undefined,
  value: number | null | undefined,
): string {
  if (enabled !== true) {
    return "Desactivado";
  }
  if (value != null && Number.isFinite(Number(value))) {
    return String(value);
  }
  return "—";
}

export function StockThresholdField({
  label,
  name,
  enabled,
  onEnabledChange,
  value,
  onValueChange,
  disabled,
  readOnly,
  dataTestId,
}: StockThresholdFieldProps) {
  if (readOnly) {
    return (
      <TextField
        label={label}
        name={name}
        value={formatThresholdReadOnly(enabled, value === "" ? null : Number(value))}
        onChange={() => {}}
        readOnly
        data-test-id={dataTestId}
      />
    );
  }

  return (
    <TextField
      label={label}
      name={name}
      type="number"
      min={0}
      density="compact"
      labelLayout="inline"
      selectOnFocus
      disabled={disabled || !enabled}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      data-test-id={dataTestId}
      inlineLeadingAdornment={
        <Switch
          density="compact"
          checked={enabled}
          onChange={onEnabledChange}
          disabled={disabled}
          data-test-id={dataTestId ? `${dataTestId}-enabled` : undefined}
        />
      }
    />
  );
}
