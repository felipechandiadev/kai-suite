import { getTodayIso, getWeekStart, Alert } from "@kai/ui";
import { getJornadaWeekAction } from "@/features/hr-jornada/actions/jornada.action";
import { JornadaCompensatoryPanel } from "./ui/JornadaCompensatoryPanel";

export const dynamic = "force-dynamic";

export default async function JornadaCompensatoryPage() {
  const weekRes = await getJornadaWeekAction(getWeekStart(getTodayIso()));
  if (!weekRes.success) return <Alert variant="error">{weekRes.message}</Alert>;
  return <JornadaCompensatoryPanel employees={weekRes.data.employees} />;
}
