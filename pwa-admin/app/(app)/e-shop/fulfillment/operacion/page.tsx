import { getDeliveryOperationsAction } from "@/features/e-shop-delivery/actions/delivery.action";
import { DeliveryOperationsPanel } from "../ui/DeliveryOperationsPanel";

export const dynamic = "force-dynamic";

export default async function EShopFulfillmentOperationsPage() {
  const operationsRes = await getDeliveryOperationsAction();

  return <DeliveryOperationsPanel board={operationsRes.success ? operationsRes.board : {}} />;
}
