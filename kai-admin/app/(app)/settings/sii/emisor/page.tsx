import { redirect } from "next/navigation";
import { SII_CONTRIBUYENTE } from "@/navigation/sii-routes";

export default function LegacySiiEmisorPage() {
  redirect(SII_CONTRIBUYENTE);
}
