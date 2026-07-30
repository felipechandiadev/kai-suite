import { getPublicCompaniesAction } from "@/features/company/actions/public-companies.action";
import { PosSetupClient } from "./PosSetupClient";

export const dynamic = "force-dynamic";

export default async function PosSetupPage() {
  const res = await getPublicCompaniesAction();
  const companies = res.success ? res.companies : [];
  const error = res.success ? null : res.error;

  return <PosSetupClient companies={companies} initialError={error} />;
}
