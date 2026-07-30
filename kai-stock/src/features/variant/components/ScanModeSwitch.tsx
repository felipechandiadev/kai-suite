"use client";

import { Switch } from "@kai/ui";

export type ScanModeSwitchProps = {
  skuMode: boolean;
  onChange: (skuMode: boolean) => void;
};

export default function ScanModeSwitch({ skuMode, onChange }: ScanModeSwitchProps) {
  return (
    <div className="rounded-lg border border-border p-3">
      <Switch
        className="w-full"
        optionLabels={{ off: "MODO CÓDIGO", on: "MODO SKU" }}
        checked={skuMode}
        onChange={onChange}
        data-test-id="variant-scan-mode-switch"
      />
    </div>
  );
}
