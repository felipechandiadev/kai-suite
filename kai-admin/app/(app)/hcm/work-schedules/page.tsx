import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getWeekStart, getTodayIso, LoadingState, Alert } from "@kai/ui";
import { getJornadaWeekAction } from "@/features/hr-jornada/actions/jornada.action";
import { listLaborUnitsAction } from "@/features/hr-labor-units/actions/labor-unit.action";
import { HCM_WORK_SCHEDULES } from "@/navigation/hcm-routes";
import { JornadaPlannerWorkspace } from "./ui/JornadaPlannerWorkspace";

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

  const laborUnitsRes = await listLaborUnitsAction();
  const laborUnits = laborUnitsRes.success
    ? laborUnitsRes.data.map((u) => ({
        id: u.id,
        name: u.name,
        code: u.code,
      }))
    : [];

  const knownIds = new Set(laborUnits.map((u) => u.id));
  if ((!laborUnitId || !knownIds.has(laborUnitId)) && laborUnits[0]) {
    const params = new URLSearchParams();
    params.set("week", weekStart);
    params.set("laborUnitId", laborUnits[0].id);
    redirect(`${HCM_WORK_SCHEDULES}?${params.toString()}`);
  }

  const weekRes = await getJornadaWeekAction(weekStart, laborUnitId);

  if (!weekRes.success) {
    return <Alert variant="error">{weekRes.message}</Alert>;
  }

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
