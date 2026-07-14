import {
  listDeliveryOccurrencesAction,
  listDeliveryZonesAction,
} from "@/features/e-shop-delivery/actions/delivery.action";
import { DeliveryCalendarPanel } from "../ui/DeliveryCalendarPanel";

export const dynamic = "force-dynamic";

export default async function EShopFulfillmentCalendarPage() {
  const [occurrencesRes, zonesRes] = await Promise.all([
    listDeliveryOccurrencesAction(),
    listDeliveryZonesAction(),
  ]);

  return (
    <DeliveryCalendarPanel
      initialOccurrences={occurrencesRes.success ? occurrencesRes.rows : []}
      zones={zonesRes.success ? zonesRes.rows : []}
    />
  );
}
