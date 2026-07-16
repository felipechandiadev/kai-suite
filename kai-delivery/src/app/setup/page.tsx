import { getPublicCompaniesAction } from "@/features/company/actions/public-companies.action";
import { DeliverySetupClient } from "./DeliverySetupClient";

export const dynamic = "force-dynamic";

export default async function DeliverySetupPage() {
  const res = await getPublicCompaniesAction();
  const companies = res.success ? res.companies : [];
  const error = res.success ? null : res.error;

  return <DeliverySetupClient companies={companies} initialError={error} />;
}
