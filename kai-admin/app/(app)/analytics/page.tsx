import { redirect } from "next/navigation";

/** Hub Resumen oculto por ahora; el menú entra por Reportes. */
export default function AnalyticsPage() {
  redirect("/analytics/reports");
}
