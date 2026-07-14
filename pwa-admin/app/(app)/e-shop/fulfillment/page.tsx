import { listEshopOrdersAction } from "@/features/e-shop-fulfillment/actions/eshop-fulfillment.action";
import { EShopOrdersPanel } from "./ui/EShopOrdersPanel";

export const dynamic = "force-dynamic";

export default async function EShopFulfillmentOrdersPage() {
  const ordersRes = await listEshopOrdersAction({ page: 1, limit: 50 });

  return (
    <EShopOrdersPanel
      rows={ordersRes.success ? ordersRes.data : []}
      total={ordersRes.success ? ordersRes.total : 0}
    />
  );
}
