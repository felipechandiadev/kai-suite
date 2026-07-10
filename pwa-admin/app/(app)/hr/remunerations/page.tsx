import { Suspense } from "react";
import { listRemunerationsForGridAction } from "@/features/hr-remunerations/actions/remuneration.action";
import { listEmployeesForGridAction } from "@/features/hr-employees/actions/employee.action";
import RemunerationsDataGrid from "./ui/RemunerationsDataGrid";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

function parseSp(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  if (Array.isArray(v)) {
    return typeof v[0] === "string" ? v[0] : "";
  }
  return typeof v === "string" ? v : "";
}

export default async function RemunerationsPage({
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

  const [allRows, employees] = await Promise.all([
    listRemunerationsForGridAction(),
    listEmployeesForGridAction(),
  ]);
  const total = allRows.length;
  const start = (page - 1) * limit;
  const rows = allRows.slice(start, start + limit);

  return (
    <div className="min-h-0 p-0" data-test-id="hr-remunerations-page-root">
      <Suspense
        fallback={
          <LoadingState className="flex items-center justify-center py-4" data-test-id="remunerations-page-skeleton" />
        }
      >
        <RemunerationsDataGrid rows={rows} total={total} employees={employees} />
      </Suspense>
    </div>
  );
}
