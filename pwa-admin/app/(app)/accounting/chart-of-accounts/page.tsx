import { Suspense } from "react";
import { listChartOfAccountsForPage } from "@/features/accounting-chart-of-accounts/actions/chart-of-accounts.action";
import ChartOfAccountsDataGrid from "./ui/ChartOfAccountsDataGrid";
import { CollectionPageLayout } from "@kai/ui";
import { ChartOfAccountsCollectionAddAction } from "./ui/ChartOfAccountsCollectionAddAction";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

function parseSp(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  if (Array.isArray(v)) {
    return typeof v[0] === "string" ? v[0] : "";
  }
  return typeof v === "string" ? v : "";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const includeInactiveRaw = parseSp(sp, "includeInactive");
  const includeInactive = includeInactiveRaw === "true" || includeInactiveRaw === "1";

  const result = await listChartOfAccountsForPage({ includeInactive });
  const hierarchy = result.success ? result.data.hierarchy : [];

  return (
    <Suspense
      fallback={
        <LoadingState className="flex items-center justify-center p-4 md:p-6 py-4" data-test-id="coa-page-skeleton" />
      }
    >
      <CollectionPageLayout
        title="Plan de cuentas"
        subtitle="Estructura jerárquica de cuentas contables."
        addAction={<ChartOfAccountsCollectionAddAction hierarchy={hierarchy} />}
        showSearch
        searchParamName="search"
        searchLabel="Buscar"
        searchPlaceholder="Buscar por código, nombre o tipo"
        data-test-id="coa-page"
      >
        <ChartOfAccountsDataGrid hierarchy={hierarchy} />
      </CollectionPageLayout>
    </Suspense>
  );
}

