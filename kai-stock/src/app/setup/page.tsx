import { getPublicCompaniesAction } from "@/features/company/actions/public-companies.action";
import { StockSetupClient } from "./StockSetupClient";

export const dynamic = "force-dynamic";

export default async function StockSetupPage() {
  const res = await getPublicCompaniesAction();
  const companies = res.success ? res.companies : [];
  const error = res.success ? null : res.error;

  return <StockSetupClient companies={companies} initialError={error} />;
}
