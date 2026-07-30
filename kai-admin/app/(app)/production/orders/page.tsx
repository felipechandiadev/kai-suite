import { listProductionBatchesAction } from "@/features/inventory-production/actions/production-batch.action";
import { ProductionOrdersPanel } from "./ui/ProductionOrdersPanel";

export const dynamic = "force-dynamic";

export default async function ProductionOrdersPage() {
  const { data } = await listProductionBatchesAction({ page: 1, limit: 50 });
  return <ProductionOrdersPanel rows={data} />;
}
