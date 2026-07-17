import { redirect } from "next/navigation";

/** Legacy path → tab Unidades under Producción. */
export default function LegacyProductionUnitsRedirect() {
  redirect("/inventory/production/units");
}
