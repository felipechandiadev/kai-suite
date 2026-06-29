"use client";

import { TextField, Switch } from "@/shared";
import type {
  StorageThresholdFieldDraft,
  VariantThresholdDraft,
} from "../lib/variant-stock-threshold-config";
import { inheritedThresholdDisplay } from "../lib/variant-stock-threshold-config";

export function VariantThresholdField({
  label,
  name,
  draft,
  onChange,
  disabled,
  dataTestId,
}: {
  label: string;
  name: string;
  draft: VariantThresholdDraft;
  onChange: (next: VariantThresholdDraft) => void;
  disabled?: boolean;
  dataTestId?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5" data-test-id={dataTestId}>
      <Switch
        checked={draft.enabled}
        onChange={(enabled) => onChange({ ...draft, enabled })}
        label={label}
        labelPosition="right"
        disabled={disabled}
        data-test-id={dataTestId ? `${dataTestId}-enabled` : undefined}
      />
      <TextField
        label=""
        name={name}
        type="number"
        min={0}
        density="compact"
        selectOnFocus
        disabled={disabled || !draft.enabled}
        value={draft.value}
        onChange={(e) => onChange({ ...draft, value: e.target.value })}
        data-test-id={dataTestId ? `${dataTestId}-value` : undefined}
      />
    </div>
  );
}

export function StorageThresholdField({
  label,
  name,
  draft,
  variantDraft,
  onChange,
  disabled,
  dataTestId,
}: {
  label: string;
  name: string;
  draft: StorageThresholdFieldDraft;
  variantDraft: VariantThresholdDraft;
  onChange: (next: StorageThresholdFieldDraft) => void;
  disabled?: boolean;
  dataTestId?: string;
}) {
  const inherited = inheritedThresholdDisplay(variantDraft);
  const inheriting = !draft.override;
  const switchChecked = inheriting ? false : draft.enabled;
  const fieldValue = inheriting ? inherited : draft.value;
  const fieldReadOnly = inheriting || !draft.enabled;

  const handleSwitchChange = (on: boolean) => {
    if (inheriting && on) {
      onChange({
        override: true,
        enabled: true,
        value: variantDraft.enabled ? variantDraft.value || "0" : "0",
      });
      return;
    }
    if (!inheriting && !on) {
      onChange({ override: false, enabled: false, value: "" });
      return;
    }
    onChange({ ...draft, enabled: on });
  };

  return (
    <div className="flex flex-col gap-1.5" data-test-id={dataTestId}>
      <Switch
        checked={switchChecked}
        onChange={handleSwitchChange}
        label={label}
        labelPosition="right"
        disabled={disabled}
        data-test-id={dataTestId ? `${dataTestId}-enabled` : undefined}
      />
      <span title={inheriting ? `Heredado de variante: ${inherited}` : undefined}>
        <TextField
          label=""
          name={name}
          type={fieldReadOnly ? "text" : "number"}
          min={fieldReadOnly ? undefined : 0}
          density="compact"
          selectOnFocus={!fieldReadOnly}
          readOnly={inheriting}
          disabled={disabled || (!inheriting && !draft.enabled)}
          value={fieldValue}
          onChange={(e) => onChange({ ...draft, value: e.target.value })}
          data-test-id={dataTestId ? `${dataTestId}-value` : undefined}
        />
      </span>
    </div>
  );
}

export function formatThresholdReadOnly(
  enabled: boolean | undefined,
  value: number | null | undefined,
): string {
  if (enabled !== true) {
    return "Desactivado";
  }
  if (value != null && Number.isFinite(Number(value))) {
    return String(Math.max(0, Math.round(Number(value))));
  }
  return "—";
}
