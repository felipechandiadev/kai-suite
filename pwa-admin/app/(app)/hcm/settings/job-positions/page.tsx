import { listJobPositionsAction } from "@/features/hr-job-positions/actions/job-position.action";
import { Alert } from "@kai/ui";
import { JobPositionsPanel } from "../ui/JobPositionsPanel";

export const dynamic = "force-dynamic";

export default async function SettingsHcmJobPositionsPage() {
  const res = await listJobPositionsAction(true);
  if (!res.success) return <Alert variant="error">{res.message}</Alert>;
  return <JobPositionsPanel initialPositions={res.data} />;
}
