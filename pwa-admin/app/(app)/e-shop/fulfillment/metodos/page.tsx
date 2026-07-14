import { listCanonicalFulfillmentMethodsAction } from "@/features/e-shop-fulfillment/actions/eshop-fulfillment.action";
import { FulfillmentMethodsPanel } from "../ui/FulfillmentMethodsPanel";

export const dynamic = "force-dynamic";

export default async function EShopFulfillmentMethodsPage() {
  const res = await listCanonicalFulfillmentMethodsAction();

  return (
    <FulfillmentMethodsPanel
      initialMethods={res.methods}
      initialReadiness={res.localDeliveryReadiness}
    />
  );
}
