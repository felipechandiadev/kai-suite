import { redirect } from "next/navigation";

/** Legacy → /production/units */
export default function LegacyInventoryProductionUnitsPage() {
  redirect("/production/units");
}
