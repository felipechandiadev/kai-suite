import { Suspense } from "react";
import { listCompaniesAction } from "@/features/companies/actions/companies.action";
import { SettingsCompaniesCollection } from "./components/SettingsCompaniesCollection";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

export default async function Page() {
  const res = await listCompaniesAction(true);
  const companies = res.success ? res.companies : [];

  return (
    <Suspense
      fallback={
        <LoadingState className="flex items-center justify-center p-4 md:p-6 py-4" data-test-id="companies-page-skeleton" />
      }
    >
      <SettingsCompaniesCollection initialCompanies={companies} />
    </Suspense>
  );
}
