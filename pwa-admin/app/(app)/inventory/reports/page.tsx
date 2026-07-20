import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import { listUnitsForPage } from "@/features/inventory-units/actions/unit.action";
import { listCategoriesForPage } from "@/features/inventory-categories/actions/category.action";
import { InventoryReportsWorkspace } from "@/features/inventory-reports/ui/InventoryReportsWorkspace";

export default async function InventoryReportsPage() {
  const [storages, units, categories] = await Promise.all([
    listStoragesForPage(),
    listUnitsForPage(),
    listCategoriesForPage(),
  ]);

  return (
    <div
      className="flex min-h-0 w-full min-w-0 flex-1 flex-col"
      data-test-id="inventory-reports-page-root"
    >
      <InventoryReportsWorkspace
        storages={storages}
        units={units}
        categories={categories}
      />
    </div>
  );
}
