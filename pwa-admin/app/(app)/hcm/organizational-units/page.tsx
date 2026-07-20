import { redirect } from "next/navigation";
import { HCM_SETTINGS_ORG_UNITS } from "@/navigation/hcm-routes";

/** Legacy: maestro solo en Configuración HCM. */
export default function LegacyOrganizationalUnitsPage() {
  redirect(HCM_SETTINGS_ORG_UNITS);
}
