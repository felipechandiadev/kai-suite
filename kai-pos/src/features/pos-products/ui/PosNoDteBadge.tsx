"use client";

import { Badge } from "@kai/ui";

export function productSkipsDte(requiresDte?: boolean | null): boolean {
  return requiresDte === false;
}

type PosNoDteBadgeProps = {
  requiresDte?: boolean | null;
  className?: string;
};

/** Badge visible cuando la variante está configurada sin DTE (`requiresDte: false`). */
export function PosNoDteBadge({ requiresDte, className = "" }: PosNoDteBadgeProps) {
  if (!productSkipsDte(requiresDte)) return null;

  return (
    <span
      className={`inline-flex shrink-0 ${className}`.trim()}
      data-test-id="pos-no-dte-badge"
    >
      <Badge variant="warning-outlined" className="text-[10px] font-semibold uppercase tracking-wide">
        Sin DTE
      </Badge>
    </span>
  );
}
