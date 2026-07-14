import { getFulfillmentSettingsAction } from "@/features/e-shop-fulfillment/actions/eshop-fulfillment.action";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import { listPriceListsForPage } from "@/features/sales-price-lists/actions/price-list.action";
import { FulfillmentSettingsPanel } from "../ui/FulfillmentSettingsPanel";
import { getDeliverySettingsAction } from "@/features/e-shop-delivery/actions/delivery.action";
import { DeliveryDepotSettingsPanel } from "../ui/DeliveryDepotSettingsPanel";

export const dynamic = "force-dynamic";

export default async function EShopFulfillmentSettingsPage() {
  const [settingsRes, deliverySettingsRes, branches, storages, priceLists] = await Promise.all([
    getFulfillmentSettingsAction(),
    getDeliverySettingsAction(),
    listBranchesForSettingsPage(),
    listStoragesForPage(),
    listPriceListsForPage(),
  ]);

  const settings = settingsRes.success
    ? settingsRes.settings
    : {
        eShopStockPolicy: "ALLOW_BACKORDER" as const,
        eShopFreeShippingThreshold: null,
        eShopDefaultBranchId: null,
        eShopDefaultStorageId: null,
        eShopDefaultPriceListId: null,
      };

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

  return (
    <div className="flex flex-col gap-6">
      <FulfillmentSettingsPanel
        initialSettings={settings}
        branches={branches}
        storages={storages}
        priceLists={priceLists}
      />
      <DeliveryDepotSettingsPanel initialSettings={deliverySettings} />
    </div>
  );
}
