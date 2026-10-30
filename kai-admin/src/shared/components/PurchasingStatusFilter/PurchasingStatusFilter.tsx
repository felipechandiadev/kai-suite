"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@kai/ui";

const OPTIONS = [
  { value: "", label: "Todas" },
  { value: "VOIDED", label: "Anuladas" },
] as const;

/** Filtro de estado (query `status`) para las grillas de compras. */
export default function PurchasingStatusFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("status") ?? "";

  const select = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set("status", value);
      else params.delete("status");
      params.delete("page");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="flex items-center gap-1" data-test-id="purchasing-status-filter">
      {OPTIONS.map((o) => (
        <Button
          key={o.value || "all"}
          variant={current === o.value ? "primary" : "outlined"}
          size="sm"
          onClick={() => select(o.value)}
          data-test-id={`purchasing-status-filter-${o.value || "all"}`}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
