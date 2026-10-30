import { ReconciliationRequest } from "@/features/inventory-reconciliation/infrastructure/reconciliation.request";
import ReconciliationBoard from "@/features/inventory-reconciliation/ui/ReconciliationBoard";

export const dynamic = "force-dynamic";

export default async function InventoryReconciliationPage() {
  const report = await ReconciliationRequest.get();
  return (
    <div className="flex min-h-0 flex-1 flex-col p-0" data-test-id="inventory-reconciliation-page">
      <ReconciliationBoard report={report} />
    </div>
  );
}
