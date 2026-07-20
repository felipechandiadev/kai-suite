import { redirect } from "next/navigation";
import { SII_IMPRESION_PRUEBA } from "@/navigation/sii-routes";

export default function LegacySiiImpresionPruebaPage() {
  redirect(SII_IMPRESION_PRUEBA);
}
