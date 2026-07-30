"use client";

import { TextField } from "@kai/ui";
import { Select } from "@kai/ui";
import {
  VARIANT_WEIGHT_UNIT_OPTIONS,
  type VariantWeightUnit,
} from "@/features/inventory-products/lib/variant-weight";

export type VariantWeightFieldsProps = {
  weight: string;
  weightUnit: VariantWeightUnit;
  onWeightChange: (value: string) => void;
  onWeightUnitChange: (unit: VariantWeightUnit) => void;
  disabled?: boolean;
  testIdPrefix?: string;
};

export function VariantWeightFields({
  weight,
  weightUnit,
  onWeightChange,
  onWeightUnitChange,
  disabled = false,
  testIdPrefix = "variant-weight",
}: VariantWeightFieldsProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-muted/10 p-3">
      <div>
        <p className="text-sm font-medium text-foreground">Peso de la pieza</p>
        <p className="text-xs text-muted-foreground">
          Peso neto por unidad. Se usa en la calculadora de precio por metal (joyería).
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField
          label="Peso"
          name={`${testIdPrefix}-value`}
          value={weight}
          onChange={(e) => onWeightChange(e.target.value)}
          placeholder="Ej: 5.2"
          inputMode="decimal"
          disabled={disabled}
          data-test-id={`${testIdPrefix}-value`}
        />
        <Select
          label="Unidad de peso"
          value={weightUnit}
          onChange={(v) => onWeightUnitChange((v as VariantWeightUnit) || "g")}
          options={VARIANT_WEIGHT_UNIT_OPTIONS}
          disabled={disabled}
          data-test-id={`${testIdPrefix}-unit`}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Se almacena como peso neto en kg (hasta 3 decimales en gramos).
      </p>
    </div>
  );
}
