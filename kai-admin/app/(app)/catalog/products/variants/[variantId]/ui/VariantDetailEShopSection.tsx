"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconButton, Switch } from "@kai/ui";
import type { ProductVariantGridRow } from "@/features/inventory-products/types/product-grid.types";
import { ProductRequest } from "@/features/inventory-products/infrastructure/product.request";

export function VariantDetailEShopSection({ variant }: { variant: ProductVariantGridRow }) {
  const router = useRouter();
  const [visible, setVisible] = useState(variant.visibleInEShop === true);
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(() => {
      void ProductRequest.patchVariantFields(variant.id, { visibleInEShop: visible }).then(
        () => router.refresh(),
      );
    });
  };

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Tienda en línea (eShop)</h3>
        <IconButton
          icon="Save"
          variant="primary"
          size="md"
          ariaLabel={pending ? "Guardando visibilidad" : "Guardar visibilidad"}
          title={pending ? "Guardando…" : "Guardar"}
          disabled={pending}
          isLoading={pending}
          onClick={handleSave}
          data-test-id="pv-section-eshop-save"
        />
      </div>
      <Switch
        checked={visible}
        onChange={setVisible}
        label="Visible en eShop"
        labelPosition="right"
        disabled={pending}
      />
    </section>
  );
}
