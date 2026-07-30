"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAttributesForPage } from "@/features/inventory-attributes/lib/fetch-attributes-for-page";
import type { AttributeListItem } from "@/features/inventory-attributes/types/attribute.types";
import type { ProductVariantGridRow } from "@/features/inventory-products/types/product-grid.types";
import { MultimediaField } from "@/shared/components/Multimedia";
import { multimediaDefaultsForEntity } from "@/shared/components/Multimedia/multimedia-field-defaults";

type VariantDetailMultimediaSectionProps = {
  variant: ProductVariantGridRow;
};

type VariantAttributeScope = {
  attributeId: string;
  attributeName: string;
  attributeValue: string;
};

function variantAttributeScopes(
  variant: ProductVariantGridRow,
  attributes: AttributeListItem[],
): VariantAttributeScope[] {
  const raw = variant.attributeValues;
  if (!raw || typeof raw !== "object") {
    return [];
  }
  const byId = new Map(attributes.map((a) => [a.id, a]));
  const scopes: VariantAttributeScope[] = [];
  for (const [attributeId, val] of Object.entries(raw)) {
    const value = val != null ? String(val).trim() : "";
    if (!value) {
      continue;
    }
    const def = byId.get(attributeId);
    scopes.push({
      attributeId,
      attributeName: def?.name ?? attributeId,
      attributeValue: value,
    });
  }
  return scopes.sort((a, b) =>
    a.attributeName.localeCompare(b.attributeName, "es", { sensitivity: "base" }),
  );
}

export function VariantDetailMultimediaSection({ variant }: VariantDetailMultimediaSectionProps) {
  const [attributes, setAttributes] = useState<AttributeListItem[]>([]);
  const defaults = multimediaDefaultsForEntity("product-variant");

  useEffect(() => {
    void (async () => {
      const list = await fetchAttributesForPage();
      setAttributes(list);
    })();
  }, []);

  const attributeScopes = useMemo(
    () => variantAttributeScopes(variant, attributes),
    [variant, attributes],
  );

  return (
    <section
      className="space-y-4 rounded-lg border border-border bg-background p-4"
      data-test-id="pv-section-multimedia"
    >
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Multimedia</h2>
        <p className="text-xs text-muted-foreground">
          Imágenes por atributo de la variante. La imagen principal del producto (en la ficha del
          producto) es la que se usa en cards y listados del eShop.
        </p>
      </div>

      {attributeScopes.length > 0 ? (
        <div className="space-y-3" data-test-id="pv-multimedia-by-attribute">
          {attributeScopes.map(({ attributeId, attributeName, attributeValue }) => (
            <MultimediaField
              key={attributeId}
              mode="persisted"
              layout="collection"
              entityType="product-variant"
              entityId={variant.id}
              attributeId={attributeId}
              title={`${attributeName}: ${attributeValue}`}
              allowPrimary={false}
              allowReorder={defaults.allowReorder}
              enableGallery={defaults.enableGallery}
              pickButton={defaults.pickButton}
              data-test-id={`pv-multimedia-attr-${attributeId}`}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground" data-test-id="pv-multimedia-no-attributes">
          Esta variante no tiene atributos con valor; no aplica multimedia por atributo.
        </p>
      )}
    </section>
  );
}
