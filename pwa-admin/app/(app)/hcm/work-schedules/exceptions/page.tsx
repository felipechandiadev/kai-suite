import { getTodayIso, getWeekStart, addDaysIso, Alert } from "@kai/ui";
import { listJornadaExceptionsAction } from "@/features/hr-jornada/actions/jornada.action";
import { JornadaExceptionsPanel } from "./ui/JornadaExceptionsPanel";

export const dynamic = "force-dynamic";

function parseSp(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const v = sp[key];
  if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : "";
  return typeof v === "string" ? v : "";
}

export default async function JornadaExceptionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const weekStart = getWeekStart(getTodayIso());
  const from = parseSp(sp, "from") || weekStart;
  const to = parseSp(sp, "to") || addDaysIso(weekStart, 6);
  const res = await listJornadaExceptionsAction(from, to);
  if (!res.success) return <Alert variant="error">{res.message}</Alert>;
  return (
    <JornadaExceptionsPanel
      exceptions={res.data}
      periodStart={from}
      periodEnd={to}
    />
  );
}
