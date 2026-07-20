import { getTodayIso, getWeekStart, Alert } from "@kai/ui";
import {
  getJornadaWeekAction,
  listAttendanceStatementsAction,
} from "@/features/hr-jornada/actions/jornada.action";
import { JornadaStatementsPanel } from "./ui/JornadaStatementsPanel";

export const dynamic = "force-dynamic";

export default async function JornadaStatementsPage() {
  const [weekRes, docsRes] = await Promise.all([
    getJornadaWeekAction(getWeekStart(getTodayIso())),
    listAttendanceStatementsAction(),
  ]);
  if (!weekRes.success) return <Alert variant="error">{weekRes.message}</Alert>;
  if (!docsRes.success) return <Alert variant="error">{docsRes.message}</Alert>;
  return (
    <JornadaStatementsPanel
      employees={weekRes.data.employees}
      initialDocs={docsRes.data}
    />
  );
}
