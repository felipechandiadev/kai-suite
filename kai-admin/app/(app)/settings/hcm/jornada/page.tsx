import { getJornadaConfigAction } from "@/features/hr-jornada/actions/jornada.action";
import { Alert } from "@kai/ui";
import { JornadaSettingsForm } from "../../../hcm/work-schedules/settings/ui/JornadaSettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsHcmJornadaPage() {
  const res = await getJornadaConfigAction();
  if (!res.success) return <Alert variant="error">{res.message}</Alert>;
  return <JornadaSettingsForm config={res.data} />;
}
