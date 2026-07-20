import { redirect } from "next/navigation";
import { SII_PRODUCCION } from "@/navigation/sii-routes";

export default function LegacySiiProduccionPage() {
  redirect(SII_PRODUCCION);
}
