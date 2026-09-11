import { BasicPageLayout } from "@kai/ui";
import { listPriceListsForPage } from "@/features/sales-price-lists/actions/price-list.action";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { listCategoriesForPage } from "@/features/inventory-categories/actions/category.action";
import { PricingWorkspace } from "@/features/pricing-analytics/ui/PricingWorkspace";

export default async function AnalyticsPricingPage() {
  const [priceLists, branches, categories] = await Promise.all([
    listPriceListsForPage(),
    listBranchesForSettingsPage(),
    listCategoriesForPage(),
  ]);

  return (
    <BasicPageLayout
      title="Precios"
      subtitle="Análisis de costo, punto de equilibrio y precio sugerido (solo lectura; la lista se edita en Ventas → Listas de precios)."
      data-test-id="analytics-pricing-page"
    >
      {priceLists.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay listas de precio configuradas. Crea una en Ventas → Listas de precios antes de
          analizar precios.
        </p>
      ) : (
        <PricingWorkspace
          priceLists={priceLists.map((p) => ({ id: p.id, label: p.name }))}
          branches={branches.map((b) => ({ id: b.id, label: b.name }))}
          categories={categories.map((c) => ({ id: c.id, label: c.name }))}
        />
      )}
    </BasicPageLayout>
  );
}
