import { redirect } from "next/navigation";
import { HCM_SETTINGS } from "@/navigation/hcm-routes";

/** Legacy path: /settings/hcm → /hcm/settings */
export default function LegacySettingsHcmPage() {
  redirect(HCM_SETTINGS);
}
