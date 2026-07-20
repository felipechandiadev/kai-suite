import { listJornadaTemplatesAction } from "@/features/hr-jornada/actions/jornada.action";
import { Alert } from "@kai/ui";
import { JornadaTemplatesPanel } from "./ui/JornadaTemplatesPanel";

export const dynamic = "force-dynamic";

export default async function JornadaTemplatesPage() {
  const res = await listJornadaTemplatesAction();
  if (!res.success) return <Alert variant="error">{res.message}</Alert>;
  return <JornadaTemplatesPanel templates={res.data} />;
}
