import { listShiftSystemsAction } from "@/features/hr-shift-systems/actions/shift-system.action";
import { Alert } from "@kai/ui";
import { ShiftSystemsPanel } from "../ui/ShiftSystemsPanel";

export const dynamic = "force-dynamic";

export default async function SettingsHcmShiftsPage() {
  const res = await listShiftSystemsAction(true);
  if (!res.success) return <Alert variant="error">{res.message}</Alert>;
  return <ShiftSystemsPanel initialSystems={res.data} />;
}
