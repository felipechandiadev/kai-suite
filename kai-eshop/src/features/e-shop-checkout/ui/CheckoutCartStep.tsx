"use client";

import { useMemo } from "react";
import { Alert } from "@kai/ui";
import { useEShopCart } from "@/features/e-shop-cart/EShopCartProvider";
import type { CartIssue } from "@/features/e-shop-cart/types/cart.types";

function fmt(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function groupIssuesByVariant(issues: CartIssue[]) {
  const map = new Map<string, CartIssue[]>();
  for (const issue of issues) {
    const existing = map.get(issue.productVariantId) ?? [];
    existing.push(issue);
    map.set(issue.productVariantId, existing);
  }
  return map;
}

export function CheckoutCartStep() {
  const { lines, subtotal, issues, revalidateCart, cartUpdating } = useEShopCart();
  const issuesByVariant = useMemo(() => groupIssuesByVariant(issues), [issues]);

  return (
    <div className="space-y-4">
      {issues.length > 0 ? (
        <div className="space-y-2">
          {issues.map((issue) => (
            <Alert key={`${issue.code}-${issue.productVariantId}`} variant="warning">
              {issue.message}
            </Alert>
          ))}
        </div>
      ) : null}

      {lines.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Tu carrito está vacío. Agrega productos antes de continuar.
        </p>
      ) : (
        <ul className="space-y-3">
          {lines.map((line) => {
            const lineIssues = issuesByVariant.get(line.productVariantId) ?? [];
            return (
              <li
                key={line.productVariantId}
                className="flex gap-3 rounded-xl border border-border p-3"
              >
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {line.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={line.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{line.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmt(line.unitPrice)} c/u
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {fmt(line.unitPrice * line.quantity)}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Cantidad: {line.quantity}
                  </p>

                  {lineIssues.length > 0 ? (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      {lineIssues.map((issue) => issue.message).join(" · ")}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-sm font-semibold">Subtotal: {fmt(subtotal)}</p>
      <button
        type="button"
        className="text-sm text-primary hover:underline"
        disabled={cartUpdating}
        onClick={() => void revalidateCart()}
      >
        Actualizar precios y stock
      </button>
    </div>
  );
}
