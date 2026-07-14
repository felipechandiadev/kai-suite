import { getDeliverySettingsAction } from "@/features/e-shop-delivery/actions/delivery.action";
import { DeliveryDepotSettingsPanel } from "../ui/DeliveryDepotSettingsPanel";

export const dynamic = "force-dynamic";

export default async function EShopFulfillmentDeliverySettingsPage() {
  const deliverySettingsRes = await getDeliverySettingsAction();

  const deliverySettings = deliverySettingsRes.success
    ? deliverySettingsRes.settings
    : {
        companyId: "",
        depotLat: null,
        depotLng: null,
        depotAddress: null,
        regionCode: "maule",
        localDeliveryEnabled: false,
        osrmUrl: null,
      };

  return <DeliveryDepotSettingsPanel initialSettings={deliverySettings} />;
}
