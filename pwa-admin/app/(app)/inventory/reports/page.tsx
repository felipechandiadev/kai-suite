import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import { InventoryReportsWorkspace } from "@/features/inventory-reports/ui/InventoryReportsWorkspace";

export default async function InventoryReportsPage() {
  const storages = await listStoragesForPage();

  return (
    <div
      className="flex min-h-0 w-full min-w-0 flex-1 flex-col"
      data-test-id="inventory-reports-page-root"
    >
      <InventoryReportsWorkspace storages={storages} />
    </div>
  );
}
