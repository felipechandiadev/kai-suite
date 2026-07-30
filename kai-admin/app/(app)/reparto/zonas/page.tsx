import {
  listDeliveryCommunesAction,
  listDeliveryZonesAction,
} from "@/features/e-shop-delivery/actions/delivery.action";
import { DeliveryZonesPanel } from "../../e-shop/fulfillment/ui/DeliveryZonesPanel";

export const dynamic = "force-dynamic";

export default async function RepartoZonesPage() {
  const [zonesRes, communesRes] = await Promise.all([
    listDeliveryZonesAction(),
    listDeliveryCommunesAction(),
  ]);

  return (
    <DeliveryZonesPanel
      initialZones={zonesRes.success ? zonesRes.rows : []}
      communes={communesRes.success ? communesRes.rows : []}
    />
  );
}
