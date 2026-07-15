import { listDeliveryCommunesAction } from "@/features/e-shop-delivery/actions/delivery.action";
import { DeliveryCoveragePanel } from "../../e-shop/fulfillment/ui/DeliveryCoveragePanel";

export const dynamic = "force-dynamic";

export default async function RepartoCoveragePage() {
  const communesRes = await listDeliveryCommunesAction();

  return <DeliveryCoveragePanel initialCommunes={communesRes.success ? communesRes.rows : []} />;
}
