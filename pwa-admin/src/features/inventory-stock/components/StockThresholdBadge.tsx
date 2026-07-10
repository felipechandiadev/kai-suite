"use client";

import Badge from "@kai/ui";
import { formatThreshold } from "../lib/stock-unit-display";

export function StockThresholdBadge({
  abbr,
  label,
  value,
  enabled,
  "data-test-id": dataTestId,
}: {
  abbr: string;
  label: string;
  value: number | null | undefined;
  enabled?: boolean;
  "data-test-id"?: string;
}) {
  const display = enabled === true ? formatThreshold(value) : "—";
  const title = enabled === true ? `${label}: ${display}` : `${label}: deshabilitado`;
  return (
    <span data-test-id={dataTestId} title={title}>
      <Badge
        variant="secondary-outlined"
        className="!inline-flex !items-center !gap-1.5 !px-1.5 !py-0 text-[10px] font-medium leading-5 tabular-nums"
      >
        <span className="text-muted-foreground">{abbr}</span>
        <span className="font-mono text-foreground">{display}</span>
      </Badge>
    </span>
  );
}
