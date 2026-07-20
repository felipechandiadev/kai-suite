import { listJobPositionsAction } from "@/features/hr-job-positions/actions/job-position.action";
import { Alert } from "@kai/ui";
import { JobPositionsPanel } from "../../settings/hcm/ui/JobPositionsPanel";

export const dynamic = "force-dynamic";

/** Ruta temporal; el maestro vive en Configuración → Capital humano → Cargos. */
export default async function HcmJobPositionsPage() {
  const res = await listJobPositionsAction(true);
  if (!res.success) return <Alert variant="error">{res.message}</Alert>;
  return (
    <div className="w-full min-w-0 space-y-4" data-test-id="hcm-job-positions-page">
      <h1 className="text-lg font-semibold">Cargos</h1>
      <JobPositionsPanel initialPositions={res.data} />
    </div>
  );
}
