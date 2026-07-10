import { Suspense } from "react";
import { listEmployeesForGridAction } from "@/features/hr-employees/actions/employee.action";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import EmployeesDataGrid from "./ui/EmployeesDataGrid";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

function parseSp(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  if (Array.isArray(v)) {
    return typeof v[0] === "string" ? v[0] : "";
  }
  return typeof v === "string" ? v : "";
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(parseSp(sp, "page") || "1", 10) || 1);
  const limit = Math.min(
    500,
    Math.max(1, parseInt(parseSp(sp, "limit") || "25", 10) || 25),
  );

  const [allRows, branches] = await Promise.all([
    listEmployeesForGridAction(),
    listBranchesForSettingsPage(),
  ]);
  const total = allRows.length;
  const start = (page - 1) * limit;
  const rows = allRows.slice(start, start + limit);

  return (
    <div className="min-h-0 p-0" data-test-id="hr-employees-page-root">
      <Suspense
        fallback={
          <LoadingState className="flex items-center justify-center py-4" data-test-id="employees-page-skeleton" />
        }
      >
        <EmployeesDataGrid rows={rows} total={total} branches={branches} />
      </Suspense>
    </div>
  );
}
