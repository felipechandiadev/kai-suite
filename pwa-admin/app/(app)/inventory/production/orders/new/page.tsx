import { redirect } from "next/navigation";

/** Legacy → /production/orders/new */
export default function LegacyInventoryProductionOrdersNewPage() {
  redirect("/production/orders/new");
}
