"use client";

import { TextField } from "@kai/ui";
import { Switch } from "@kai/ui";
import type { StorageThresholdFieldDraft, VariantThresholdDraft } from "../lib/variant-stock-threshold-config";
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
    <TextField
      label={label}
      name={name}
      type="number"
      min={0}
      density="compact"
      labelLayout="inline"
      selectOnFocus
      disabled={disabled || !draft.enabled}
      value={draft.value}
      onChange={(e) => onChange({ ...draft, value: e.target.value })}
      data-test-id={dataTestId}
      inlineLeadingAdornment={
        <Switch
          density="compact"
          checked={draft.enabled}
          onChange={(enabled) => onChange({ ...draft, enabled })}
          disabled={disabled}
          data-test-id={`${dataTestId}-enabled`}
        />
      }
    />
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
    <TextField
      label={label}
      name={name}
      type={fieldReadOnly ? "text" : "number"}
      min={fieldReadOnly ? undefined : 0}
      density="compact"
      labelLayout="inline"
      selectOnFocus={!fieldReadOnly}
      readOnly={inheriting}
      disabled={disabled || (!inheriting && !draft.enabled)}
      value={fieldValue}
      onChange={(e) => onChange({ ...draft, value: e.target.value })}
      data-test-id={dataTestId}
      title={inheriting ? `Heredado de variante: ${inherited}` : undefined}
      inlineLeadingAdornment={
        <Switch
          density="compact"
          checked={switchChecked}
          onChange={handleSwitchChange}
          disabled={disabled}
          data-test-id={`${dataTestId}-enabled`}
        />
      }
    />
  );
}
