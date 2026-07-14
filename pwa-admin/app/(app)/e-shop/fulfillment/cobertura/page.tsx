import { listDeliveryCommunesAction } from "@/features/e-shop-delivery/actions/delivery.action";
import { DeliveryCoveragePanel } from "../ui/DeliveryCoveragePanel";

export const dynamic = "force-dynamic";

export default async function EShopFulfillmentCoveragePage() {
  const communesRes = await listDeliveryCommunesAction();

  return <DeliveryCoveragePanel initialCommunes={communesRes.success ? communesRes.rows : []} />;
}
