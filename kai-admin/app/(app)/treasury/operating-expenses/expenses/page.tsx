import { Suspense } from "react";
import { listOperationalExpensesForGrid } from "@/features/treasury-expenses/actions/operational-expense.action";
import ExpensesDataGrid from "./ui/ExpensesDataGrid";
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
  const search = parseSp(sp, "search");
  const status = parseSp(sp, "status");

  const result = await listOperationalExpensesForGrid({
    search,
    status: (status || "") as
      | ""
      | "DRAFT"
      | "PENDING_APPROVAL"
      | "APPROVED"
      | "REJECTED"
      | "CANCELLED",
  });

  return (
    <div className="min-h-0 p-0" data-test-id="operational-expenses-page-root">
      <Suspense
        fallback={
          <LoadingState className="flex items-center justify-center py-4" data-test-id="operational-expenses-page-skeleton" />
        }
      >
        <ExpensesDataGrid
          rows={result.rows}
          total={result.total}
          categories={result.categories}
        />
      </Suspense>
    </div>
  );
}

