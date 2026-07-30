import { redirect } from "next/navigation";
import { SII } from "@/navigation/sii-routes";

export default function LegacySiiSettingsPage() {
  redirect(SII);
}
