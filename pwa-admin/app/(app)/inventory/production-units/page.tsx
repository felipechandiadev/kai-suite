import { redirect } from "next/navigation";

/** Legacy → /production/units */
export default function LegacyProductionUnitsRedirect() {
  redirect("/production/units");
}
