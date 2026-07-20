import { redirect } from "next/navigation";
import { SII_CREDENCIALES } from "@/navigation/sii-routes";

export default function LegacySiiCredencialesPage() {
  redirect(SII_CREDENCIALES);
}
