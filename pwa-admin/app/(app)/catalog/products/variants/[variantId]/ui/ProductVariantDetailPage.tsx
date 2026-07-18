"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, IconButton } from "@kai/ui";
import type { ProductVariantGridRow } from "@/features/inventory-products/types/product-grid.types";
import type { RecipeDto } from "@/features/recipes/types/recipe.types";
import { CreateRecipeDialog } from "../../../ui/CreateRecipeDialog";
import {
  catalogProductTypeAllowsRecipeBom,
  catalogProductTypeIsFinishedGood,
  normalizeCatalogProductType,
} from "../../../ui/catalog-product-type-options";
import {
  VariantDetailIdentitySection,
  VariantDetailInventorySection,
  VariantDetailPricingSection,
} from "./VariantDetailPageSections";
import { VariantDetailStockByStorageSection } from "./VariantDetailStockByStorageSection";
import { VariantDetailStockValueSection } from "./VariantDetailStockValueSection";
import { VariantDetailLogisticsSection } from "./VariantDetailLogisticsSection";
import { VariantDetailMultimediaSection } from "./VariantDetailMultimediaSection";
import { VariantDetailRecipeSection } from "./VariantDetailRecipeSection";
import { VariantDetailProductionSection } from "./VariantDetailProductionSection";
import { VariantDetailEShopSection } from "./VariantDetailEShopSection";
import { VariantDetailPurchasesSection } from "./VariantDetailPurchasesSection";
import { VariantDetailSiiSection } from "./VariantDetailSiiSection";
import { VariantDetailSectionNav } from "./VariantDetailSectionNav";
import {
  VARIANT_DETAIL_TABS,
  type VariantDetailSectionId,
  variantDetailSectionFromHash,
} from "./variant-detail-section.types";

function variantAttributeValueBadges(v: ProductVariantGridRow): Array<{ key: string; value: string }> {
  const raw = v.attributeValues;
  if (!raw || typeof raw !== "object") {
    return [];
  }
  return Object.entries(raw)
    .map(([key, val]) => ({ key, value: val != null ? String(val).trim() : "" }))
    .filter((x) => x.value.length > 0);
}

type Props = {
  product: {
    id: string;
    name: string;
    productType: string | null;
    categoryName?: string | null;
    brand?: string | null;
  };
  variant: ProductVariantGridRow;
};

export default function ProductVariantDetailPage({ product, variant: initialVariant }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [variant, setVariant] = useState(initialVariant);
  const [bomOpen, setBomOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeDto | null>(null);
  const [recipeRefreshKey, setRecipeRefreshKey] = useState(0);
  const [activeSection, setActiveSection] = useState<VariantDetailSectionId>("identidad");
  const [stockRefreshKey, setStockRefreshKey] = useState(0);

  useEffect(() => {
    setVariant(initialVariant);
  }, [initialVariant]);

  const showRecipe = catalogProductTypeAllowsRecipeBom(product.productType);
  const showProduction = catalogProductTypeIsFinishedGood(product.productType);

  const visibleTabs = useMemo(
    () =>
      VARIANT_DETAIL_TABS.filter((t) => {
        if (t.id === "receta") return showRecipe;
        if (t.id === "produccion") return showProduction;
        return true;
      }),
    [showRecipe, showProduction],
  );

  useEffect(() => {
    const fromHash = variantDetailSectionFromHash(window.location.hash);
    if (fromHash && visibleTabs.some((t) => t.id === fromHash)) {
      setActiveSection(fromHash);
    }
  }, [visibleTabs]);

  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === activeSection)) {
      setActiveSection("identidad");
    }
  }, [activeSection, visibleTabs]);

  const selectSection = useCallback((id: VariantDetailSectionId) => {
    setActiveSection(id);
    const nextHash = `#${id}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${nextHash}`);
    }
  }, []);

  const headerAttributeBadges = useMemo(() => variantAttributeValueBadges(variant), [variant]);

  const goBackToProducts = useCallback(() => {
    const returnTo = searchParams.get("returnTo")?.trim();
    if (returnTo && returnTo.startsWith("/catalog/products")) {
      router.push(returnTo);
      return;
    }
    const qs = new URLSearchParams();
    qs.set("expandProduct", product.id);
    router.push(`/catalog/products?${qs.toString()}`);
  }, [router, searchParams, product.id]);

  const sectionProps = {
    productId: product.id,
    productType: product.productType,
    variant,
    productCategoryName: product.categoryName,
    productBrand: product.brand,
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 pb-16" data-test-id="product-variant-detail-root">
      <header className="border-b border-border pb-4" data-test-id="product-variant-detail-header">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-3">
          <IconButton
            icon="ArrowLeft"
            variant="action"
            size="sm"
            onClick={goBackToProducts}
            ariaLabel="Volver a la página anterior"
            data-test-id="product-variant-detail-back"
          />
          <h1
            className="min-w-0 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            title={product.name}
          >
            {product.name}
          </h1>
          {headerAttributeBadges.length > 0 ? (
            <div
              className="flex min-w-0 flex-wrap items-center gap-1.5"
              data-test-id="product-variant-detail-header-attrs"
            >
              {headerAttributeBadges.map(({ key, value }) => (
                <Badge
                  key={key}
                  variant="secondary-outlined"
                  className="max-w-full shrink-0 truncate text-xs font-normal sm:text-sm"
                >
                  {value}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        <p className="mt-3 font-mono text-sm text-muted-foreground" data-test-id="product-variant-detail-sku">
          {variant.sku}
        </p>
        {variant.barcode?.trim() ? (
          <p className="mt-1 text-xs text-muted-foreground" data-test-id="product-variant-detail-barcode">
            Código de barras: {variant.barcode.trim()}
          </p>
        ) : null}
      </header>

      <VariantDetailSectionNav tabs={visibleTabs} activeId={activeSection} onSelect={selectSection} />

      <div
        id={`pv-section-panel-${activeSection}`}
        role="tabpanel"
        aria-labelledby={`pv-section-tab-${activeSection}`}
        className="min-h-[16rem]"
        data-test-id="product-variant-detail-section-panel"
        data-active-section={activeSection}
      >
        {activeSection === "identidad" ? <VariantDetailIdentitySection {...sectionProps} /> : null}
        {activeSection === "precios" ? <VariantDetailPricingSection {...sectionProps} /> : null}
        {activeSection === "sii" ? <VariantDetailSiiSection variant={variant} /> : null}
        {activeSection === "compras" ? (
          <VariantDetailPurchasesSection variant={variant} productType={product.productType} />
        ) : null}
        {activeSection === "inventario" ? (
          <div className="flex flex-col gap-4">
            <VariantDetailStockValueSection variant={variant} refreshKey={stockRefreshKey} />
            <VariantDetailInventorySection {...sectionProps} />
            <VariantDetailStockByStorageSection
              variant={variant}
              onStockChanged={() => setStockRefreshKey((k) => k + 1)}
            />
          </div>
        ) : null}
        {activeSection === "despacho" ? <VariantDetailLogisticsSection variant={variant} /> : null}
        {activeSection === "multimedia" ? <VariantDetailMultimediaSection variant={variant} /> : null}
        {activeSection === "eshop" ? <VariantDetailEShopSection variant={variant} /> : null}
        {activeSection === "receta" && showRecipe ? (
          <VariantDetailRecipeSection
            outputVariantId={variant.id}
            refreshKey={recipeRefreshKey}
            onCreateRecipe={() => {
              setEditingRecipe(null);
              setBomOpen(true);
            }}
            onEditRecipe={(recipe) => {
              setEditingRecipe(recipe);
              setBomOpen(true);
            }}
          />
        ) : null}
        {activeSection === "produccion" && showProduction ? (
          <VariantDetailProductionSection variantId={variant.id} />
        ) : null}
      </div>

      <CreateRecipeDialog
        open={bomOpen}
        onClose={() => {
          setBomOpen(false);
          setEditingRecipe(null);
        }}
        editRecipe={editingRecipe}
        outputVariantId={variant.id}
        outputSku={variant.sku}
        productName={product.name}
        outputAttributeValues={variant.attributeValues}
        productType={normalizeCatalogProductType(product.productType)}
        onSuccess={async () => {
          setBomOpen(false);
          setEditingRecipe(null);
          setRecipeRefreshKey((key) => key + 1);
          await router.refresh();
        }}
      />
    </div>
  );
}
