import { getPublicCompaniesAction } from "@/features/company/actions/public-companies.action";
import { AppSetupClient } from "./AppSetupClient";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const res = await getPublicCompaniesAction();
  const companies = res.success ? res.companies : [];
  const error = res.success ? null : res.error;

  return <AppSetupClient companies={companies} initialError={error} appLabel="KDS" />;
}
