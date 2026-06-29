"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { Barcode } from "lucide-react";
import Link from "next/link";
import { Alert, Badge, DotProgress } from "@/shared";
import { VariantDetailPricingSection } from "@/features/variant-pricing/components/VariantDetailPricingSection";
import { VariantDetailPhotoSection } from "@/features/variant-multimedia/components/VariantDetailPhotoSection";
import { VariantDetailStockByStorageSection } from "./VariantDetailStockByStorageSection";
import { VariantDetailStockConfigSection } from "@/features/stock/components/VariantDetailStockConfigSection";
import { variantAttributeValueBadges } from "../ui/VariantProductPreview";
import { handleUnauthorizedClient } from "@/lib/auth/handle-unauthorized";
import { getVariantDetailAction } from "../actions/variant.action";
import type { VariantDetail } from "../types/variant.types";
import { variantBarcodePath } from "../lib/variant-routes";

export default function VariantDetailPage() {
  const params = useParams();
  const variantId = typeof params.variantId === "string" ? params.variantId.trim() : "";

  const [error, setError] = useState("");
  const [variant, setVariant] = useState<VariantDetail | null>(null);
  const [stockReloadKey, setStockReloadKey] = useState(0);
  const [pending, startTransition] = useTransition();

  const attributeBadges = useMemo(
    () => variantAttributeValueBadges(variant?.attributeValues ?? {}),
    [variant?.attributeValues],
  );

  const loadDetail = useCallback(async (id: string) => {
    setError("");
    const detailRes = await getVariantDetailAction(id);
    if (!detailRes.success) {
      if (handleUnauthorizedClient(detailRes)) {
        return;
      }
      setError(detailRes.error);
      setVariant(null);
      return;
    }
    setVariant(detailRes.variant);
  }, []);

  useEffect(() => {
    if (!variantId) return;
    startTransition(() => {
      void loadDetail(variantId);
    });
  }, [variantId, loadDetail]);

  if (!variantId) {
    return <Alert variant="error">Variante no indicada.</Alert>;
  }

  if (pending && !variant) {
    return (
      <div className="flex justify-center py-12">
        <DotProgress />
      </div>
    );
  }

  if (!variant) {
    return error ? <Alert variant="error">{error}</Alert> : null;
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      {error ? <Alert variant="error">{error}</Alert> : null}

      <section className="flex flex-col gap-4">
        <div className="rounded-lg p-4">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">
                SKU: {variant.sku || "—"}
              </p>
              <h1
                className="mt-1 text-lg font-semibold leading-snug text-foreground"
                title={variant.productName}
              >
                {variant.productName}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Código: {variant.barcode?.trim() || "—"}
              </p>
              {attributeBadges.length > 0 ? (
                <div
                  className="mt-2 flex flex-wrap gap-1.5"
                  data-test-id="variant-detail-attrs"
                >
                  {attributeBadges.map(({ key, value }) => (
                    <Badge
                      key={key}
                      variant="secondary-outlined"
                      className="max-w-full shrink-0 truncate text-xs font-normal"
                    >
                      {value}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
            <Link
              href={variantBarcodePath(variant.variantId)}
              className="shrink-0 rounded-lg border border-border p-2"
              aria-label="Actualizar código de barras"
            >
              <Barcode size={20} />
            </Link>
          </div>
        </div>

        <VariantDetailPricingSection
          variant={variant}
          onPricingChanged={() => void loadDetail(variant.variantId)}
        />

        <VariantDetailStockConfigSection
          variant={variant}
          onConfigChanged={() => {
            void loadDetail(variant.variantId);
            setStockReloadKey((k) => k + 1);
          }}
        />

        <VariantDetailStockByStorageSection
          variantId={variant.variantId}
          sku={variant.sku}
          reloadKey={stockReloadKey}
          onStockChanged={() => void loadDetail(variant.variantId)}
        />

        <VariantDetailPhotoSection
          variant={variant}
          onPhotosChanged={() => void loadDetail(variant.variantId)}
        />
      </section>
    </div>
  );
}
