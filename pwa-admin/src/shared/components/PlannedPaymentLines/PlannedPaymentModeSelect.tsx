"use client";

import { useMemo } from "react";
import { SelectDefault as Select } from "@kai/ui";
import {
  PLANNED_PAYMENT_MODE_OPTIONS,
  type PlannedPaymentMode,
} from "./planned-payment-mode.types";

export type PlannedPaymentModeSelectProps = {
  value: PlannedPaymentMode;
  onChange: (mode: PlannedPaymentMode) => void;
  disabled?: boolean;
  /** Por defecto: «Pago». */
  label?: string;
  name?: string;
  "data-test-id"?: string;
};

export function PlannedPaymentModeSelect({
  value,
  onChange,
  disabled = false,
  label = "Pago",
  name = "planned-payment-mode",
  "data-test-id": dataTestId = "planned-payment-mode",
}: PlannedPaymentModeSelectProps) {
  const options = useMemo(
    () => PLANNED_PAYMENT_MODE_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
    [],
  );

  return (
    <Select
      label={label}
      name={name}
      options={options}
      value={value}
      onChange={(id) => onChange((id ?? "PENDING") as PlannedPaymentMode)}
      disabled={disabled}
      data-test-id={dataTestId}
    />
  );
}
