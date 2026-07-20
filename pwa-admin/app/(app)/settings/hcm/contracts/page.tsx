import { getJornadaConfigAction } from "@/features/hr-jornada/actions/jornada.action";
import { Alert } from "@kai/ui";
import { ContractDefaultsForm } from "../ui/ContractDefaultsForm";

export const dynamic = "force-dynamic";

export default async function SettingsHcmContractsPage() {
  const res = await getJornadaConfigAction();
  if (!res.success) return <Alert variant="error">{res.message}</Alert>;
  return <ContractDefaultsForm config={res.data} />;
}
