"use client";

import { useSearchParams } from "next/navigation";
import { Card } from "@kai/ui";

/**
 * Mismo query que CollectionPageLayout: refleja el valor en la URL al instante (cliente).
 */
export function UrlSearchLive({ paramName = "search" }: { paramName?: string }) {
  const sp = useSearchParams();
  const v = sp.get(paramName) ?? "";
  return (
    <Card>
      <p className="text-sm font-medium text-foreground">Misma URL, vista en el cliente</p>
      <p className="mt-2 text-sm text-muted">
        Valor actual de <code className="rounded bg-neutral px-1.5 py-0.5 text-xs">?{paramName}=</code> (
        <code>useSearchParams</code>):
      </p>
      <p className="mt-3 break-all font-mono text-lg text-foreground">{v || "— vacío —"}</p>
    </Card>
  );
}
