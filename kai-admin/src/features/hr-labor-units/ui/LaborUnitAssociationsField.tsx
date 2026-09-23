"use client";

import { IdListAssociationsField } from "./IdListAssociationsField";

export type LaborUnitOption = {
  id: string;
  code?: string;
  name: string;
};

type Props = {
  options: LaborUnitOption[];
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  disabled?: boolean;
  helperText?: string;
};

export function LaborUnitAssociationsField({
  options,
  value,
  onChange,
  label = "Unidades laborales",
  disabled,
  helperText,
}: Props) {
  return (
    <IdListAssociationsField
      options={options}
      value={value}
      onChange={onChange}
      label={label}
      addLabel="Agregar unidad laboral"
      addAriaLabel="Agregar unidad laboral"
      emptyAvailableLabel="Sin más ULs"
      disabled={disabled}
      helperText={helperText}
      testId="labor-unit-associations-field"
      addTestId="labor-unit-associations-add"
    />
  );
}
