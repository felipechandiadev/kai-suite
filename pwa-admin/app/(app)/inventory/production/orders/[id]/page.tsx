import { notFound } from "next/navigation";
import { getProductionBatchAction } from "@/features/inventory-production/actions/production-batch.action";
import { ProductionOrderDetail } from "./ui/ProductionOrderDetail";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ProductionOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const batch = await getProductionBatchAction(id);
  if (!batch) notFound();
  return <ProductionOrderDetail batch={batch} />;
}
