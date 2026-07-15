import { listCanonicalFulfillmentMethodsAction } from "@/features/e-shop-fulfillment/actions/eshop-fulfillment.action";
import { getFulfillmentSettingsAction } from "@/features/e-shop-fulfillment/actions/eshop-fulfillment.action";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import { listPriceListsForPage } from "@/features/sales-price-lists/actions/price-list.action";
import { FulfillmentMethodsPanel } from "../ui/FulfillmentMethodsPanel";
import { FulfillmentSettingsPanel } from "../ui/FulfillmentSettingsPanel";

export const dynamic = "force-dynamic";

export default async function EShopFulfillmentMethodsPage() {
  const [methodsRes, settingsRes, branches, storages, priceLists] = await Promise.all([
    listCanonicalFulfillmentMethodsAction(),
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
    <div className="flex flex-col gap-8">
      <FulfillmentMethodsPanel
        initialMethods={methodsRes.methods}
        initialReadiness={methodsRes.localDeliveryReadiness}
      />
      <div id="configuracion-tienda">
        <FulfillmentSettingsPanel
          initialSettings={settings}
          branches={branches}
          storages={storages}
          priceLists={priceLists}
        />
      </div>
    </div>
  );
}
