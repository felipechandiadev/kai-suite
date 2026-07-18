import { redirect } from "next/navigation";

/** Legacy → /production/orders */
export default function LegacyInventoryProductionIndexPage() {
  redirect("/production/orders");
}
