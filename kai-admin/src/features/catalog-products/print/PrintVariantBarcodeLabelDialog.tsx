"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Dialog } from "@kai/ui";
import type { VariantBarcodeLabelLayout } from "@kai/print-service-client";
import { fetchAttributesForPage } from "@/features/inventory-attributes/lib/fetch-attributes-for-page";
import { fetchPriceListsForPage } from "@/features/sales-price-lists/lib/fetch-price-lists-for-page";
import type {
  ProductGridRow,
  ProductVariantGridRow,
} from "@/features/inventory-products/types/product-grid.types";
import type { VariantBarcodeLabelPrintInput } from "./variant-barcode-label-print-html";

type Props = {
  open: boolean;
  product: ProductGridRow | null;
  variant: ProductVariantGridRow | null;
  printing?: boolean;
  onClose: () => void;
  onConfirm: (input: VariantBarcodeLabelPrintInput) => void;
};

type LayoutOption = {
  id: VariantBarcodeLabelLayout;
  title: string;
  description: string;
};

const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: "minimal",
    title: "Mínima",
    description: "Nombre, SKU y código de barras.",
  },
  {
    id: "detailed",
    title: "Completa",
    description: "Nombre, atributos, precio, SKU y código de barras.",
  },
];

function formatClpMoney(amount: number, currency = "CLP"): string {
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: currency || "CLP",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return String(Math.round(amount));
  }
}

function resolvePriceLabel(
  variant: ProductVariantGridRow,
  defaultPriceListId: string | null,
): string | undefined {
  const items = variant.priceListItems ?? [];
  const preferred =
    defaultPriceListId != null
      ? items.find((p) => p.priceListId === defaultPriceListId)
      : undefined;
  const item = preferred ?? items[0];
  if (item && Number.isFinite(item.grossPrice)) {
    return formatClpMoney(item.grossPrice, item.currency || "CLP");
  }
  if (typeof variant.basePrice === "number" && Number.isFinite(variant.basePrice)) {
    return formatClpMoney(variant.basePrice, "CLP");
  }
  return undefined;
}

function resolveAttributes(
  variant: ProductVariantGridRow,
  nameById: Map<string, string>,
): Array<{ label?: string; value: string }> {
  const raw = variant.attributeValues;
  if (!raw || typeof raw !== "object") return [];
  return Object.entries(raw)
    .map(([attributeId, val]) => {
      const value = val != null ? String(val).trim() : "";
      if (!value) return null;
      const label = nameById.get(attributeId)?.trim() || undefined;
      return label ? { label, value } : { value };
    })
    .filter((x): x is { label?: string; value: string } => x != null);
}

export function PrintVariantBarcodeLabelDialog({
  open,
  product,
  variant,
  printing = false,
  onClose,
  onConfirm,
}: Props) {
  const [layout, setLayout] = useState<VariantBarcodeLabelLayout>("minimal");
  const [attrNameById, setAttrNameById] = useState<Map<string, string>>(new Map());
  const [defaultPriceListId, setDefaultPriceListId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLayout("minimal");
    let cancelled = false;
    void (async () => {
      const [attrs, priceLists] = await Promise.all([
        fetchAttributesForPage().catch(() => []),
        fetchPriceListsForPage().catch(() => []),
      ]);
      if (cancelled) return;
      const map = new Map<string, string>();
      for (const a of attrs) {
        const name = a.name?.trim();
        if (a.id && name) map.set(a.id, name);
      }
      setAttrNameById(map);
      const def =
        priceLists.find((p) => p.isDefault && p.isActive)?.id ??
        priceLists.find((p) => p.isDefault)?.id ??
        priceLists.find((p) => p.isActive)?.id ??
        priceLists[0]?.id ??
        null;
      setDefaultPriceListId(def);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleConfirm = useCallback(() => {
    if (!product || !variant) return;
    const barcode = variant.barcode?.trim() ?? "";
    if (!barcode) return;

    const input: VariantBarcodeLabelPrintInput = {
      productName: product.name,
      sku: variant.sku?.trim() ?? "",
      barcode,
      layout,
    };
    if (layout === "detailed") {
      const attributes = resolveAttributes(variant, attrNameById);
      const priceLabel = resolvePriceLabel(variant, defaultPriceListId);
      if (attributes.length > 0) input.attributes = attributes;
      if (priceLabel) input.priceLabel = priceLabel;
    }
    onConfirm(input);
  }, [attrNameById, defaultPriceListId, layout, onConfirm, product, variant]);

  const canPrint = Boolean(product && variant?.barcode?.trim()) && !printing;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Imprimir etiqueta"
      size="sm"
      data-test-id="print-variant-barcode-label-dialog"
      actions={
        <>
          <Button
            variant="text"
            onClick={onClose}
            disabled={printing}
            data-test-id="print-variant-barcode-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!canPrint}
            data-test-id="print-variant-barcode-confirm"
          >
            {printing ? "Imprimiendo…" : "Imprimir"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Elige el formato de la etiqueta de código de barras.
        </p>
        <div className="flex flex-col gap-2">
          {LAYOUT_OPTIONS.map((opt) => {
            const selected = layout === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setLayout(opt.id)}
                disabled={printing}
                className={[
                  "rounded-lg border p-3 text-left transition-colors",
                  selected
                    ? "border-primary bg-muted/40"
                    : "border-border hover:border-primary/40 hover:bg-muted/20",
                ].join(" ")}
                data-test-id={`print-variant-barcode-layout-${opt.id}`}
              >
                <span className="block text-sm font-semibold text-foreground">{opt.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {opt.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}
