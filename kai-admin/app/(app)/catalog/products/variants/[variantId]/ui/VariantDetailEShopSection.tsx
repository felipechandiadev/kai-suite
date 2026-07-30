"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@kai/ui";
import { Button } from "@kai/ui";
import type { ProductVariantGridRow } from "@/features/inventory-products/types/product-grid.types";
import { ProductRequest } from "@/features/inventory-products/infrastructure/product.request";

export function VariantDetailEShopSection({ variant }: { variant: ProductVariantGridRow }) {
  const router = useRouter();
  const [visible, setVisible] = useState(variant.visibleInEShop === true);
  const [pending, startTransition] = useTransition();

  return (
    <section className="rounded-xl border border-border p-4 space-y-3">
      <h3 className="font-semibold text-sm">Tienda en línea (eShop)</h3>
      <Switch
        checked={visible}
        onChange={setVisible}
        label="Visible en eShop"
        labelPosition="right"
        disabled={pending}
      />
      <Button
        variant="primary"
        size="sm"
        disabled={pending}
        onClick={() => {
          startTransition(() => {
            void ProductRequest.patchVariantFields(variant.id, { visibleInEShop: visible }).then(
              () => router.refresh(),
            );
          });
        }}
      >
        Guardar visibilidad
      </Button>
    </section>
  );
}
