import { listAfpFundsAction } from "@/features/hr-afp-funds/actions/afp-fund.action";
import { Alert } from "@kai/ui";
import { AfpFundsPanel } from "../ui/AfpFundsPanel";

export const dynamic = "force-dynamic";

export default async function SettingsHcmAfpPage() {
  const res = await listAfpFundsAction(true);
  if (!res.success) return <Alert variant="error">{res.message}</Alert>;
  return <AfpFundsPanel initialFunds={res.data} />;
}
