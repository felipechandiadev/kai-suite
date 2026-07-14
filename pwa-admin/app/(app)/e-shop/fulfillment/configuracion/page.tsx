import { getFulfillmentSettingsAction } from "@/features/e-shop-fulfillment/actions/eshop-fulfillment.action";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import { listPriceListsForPage } from "@/features/sales-price-lists/actions/price-list.action";
import { FulfillmentSettingsPanel } from "../ui/FulfillmentSettingsPanel";

export const dynamic = "force-dynamic";

export default async function EShopFulfillmentSettingsPage() {
  const [settingsRes, branches, storages, priceLists] = await Promise.all([
    getFulfillmentSettingsAction(),
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

  return (
    <FulfillmentSettingsPanel
      initialSettings={settings}
      branches={branches}
      storages={storages}
      priceLists={priceLists}
    />
  );
}
