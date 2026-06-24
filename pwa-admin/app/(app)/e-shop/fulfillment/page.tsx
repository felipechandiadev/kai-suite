import { BasicPageLayout } from "@/shared/components/layouts/BasicPageLayout";
import { FulfillmentPageContent } from "./FulfillmentPageContent";
import {
  getFulfillmentSettingsAction,
  listEshopOrdersAction,
  listFulfillmentMethodsAction,
} from "@/features/e-shop-fulfillment/actions/eshop-fulfillment.action";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import { listPriceListsForPage } from "@/features/sales-price-lists/actions/price-list.action";

export const dynamic = "force-dynamic";

export default async function EShopFulfillmentPage() {
  const [settingsRes, methodsRes, ordersRes, branches, storages, priceLists] = await Promise.all([
    getFulfillmentSettingsAction(),
    listFulfillmentMethodsAction(),
    listEshopOrdersAction({ page: 1, limit: 50 }),
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
    <BasicPageLayout
      title="Encargos y envíos"
      subtitle="Pedidos web, métodos de entrega y política de stock"
    >
      <FulfillmentPageContent
        settings={settings}
        methods={methodsRes.success ? methodsRes.rows : []}
        orders={ordersRes.success ? ordersRes.data : []}
        ordersTotal={ordersRes.success ? ordersRes.total : 0}
        branches={branches}
        storages={storages}
        priceLists={priceLists}
      />
    </BasicPageLayout>
  );
}
