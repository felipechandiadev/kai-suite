import { Suspense } from "react";
import { getWeekStart, getTodayIso, LoadingState } from "@kai/ui";
import { getJornadaWeekAction } from "@/features/hr-jornada/actions/jornada.action";
import { listLaborUnitsAction } from "@/features/hr-labor-units/actions/labor-unit.action";
import { JornadaPlannerWorkspace } from "./ui/JornadaPlannerWorkspace";
import { Alert } from "@kai/ui";

export const dynamic = "force-dynamic";

function parseSp(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const v = sp[key];
  if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : "";
  return typeof v === "string" ? v : "";
}

export default async function JornadaPlanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const weekStart =
    parseSp(sp, "week") || getWeekStart(getTodayIso());
  const laborUnitId = parseSp(sp, "laborUnitId") || null;

  const [weekRes, laborUnitsRes] = await Promise.all([
    getJornadaWeekAction(weekStart, laborUnitId),
    listLaborUnitsAction(),
  ]);

  if (!weekRes.success) {
    return <Alert variant="error">{weekRes.message}</Alert>;
  }

  const laborUnits = laborUnitsRes.success
    ? laborUnitsRes.data.map((u) => ({
        id: u.id,
        name: u.name,
        code: u.code,
      }))
    : [];

  const plan = laborUnitId
    ? weekRes.data
    : {
        ...weekRes.data,
        employees: [],
        instances: [],
        findings: [],
        worstSeverity: "OK" as const,
      };

  return (
    <Suspense
      fallback={
        <LoadingState className="flex items-center justify-center py-8" />
      }
    >
      <JornadaPlannerWorkspace
        initialPlan={plan}
        laborUnits={laborUnits}
      />
    </Suspense>
  );
}
