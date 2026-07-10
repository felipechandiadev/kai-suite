"use client";

import { Badge, Button } from "@kai/ui";
import type { FiscalSubPack } from "../types/fiscal.types";

type Props = {
  subPack: FiscalSubPack;
  onViewFolios: () => void;
};

function subPackStatusBadge(subPack: FiscalSubPack) {
  if (subPack.isCurrent) {
    return { label: "Corriente", variant: "success-outlined" as const };
  }
  if (subPack.isExhausted) {
    return { label: "Agotado", variant: "secondary-outlined" as const };
  }
  return { label: "Standby", variant: "warning-outlined" as const };
}

export function FolioSubPackRow({ subPack, onViewFolios }: Props) {
  const badge = subPackStatusBadge(subPack);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm">
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium">
          {subPack.label?.trim() || subPack.pointOfSaleName || "POS sin nombre"}
          <span className="ml-2 font-mono text-xs text-muted-foreground">{subPack.subPackCode}</span>
          <Badge variant={badge.variant} className="ml-2 align-middle">
            {badge.label}
          </Badge>
        </p>
        <p className="text-xs text-muted-foreground">
          {subPack.pointOfSaleName && subPack.label?.trim() ? `${subPack.pointOfSaleName} · ` : ""}
          Inicio {subPack.rangeFrom} · Término {subPack.rangeTo} · disponibles{" "}
          {subPack.availableFolios}
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={onViewFolios}>
        Ver folios
      </Button>
    </div>
  );
}
