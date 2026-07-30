import { redirect } from "next/navigation";
import { SETTINGS_HCM_JORNADA } from "@/navigation/hcm-routes";

export default function JornadaSettingsRedirectPage() {
  redirect(SETTINGS_HCM_JORNADA);
}
