import { redirect } from "next/navigation";

/** Legacy → /production/orders */
export default function LegacyInventoryProductionOrdersPage() {
  redirect("/production/orders");
}
