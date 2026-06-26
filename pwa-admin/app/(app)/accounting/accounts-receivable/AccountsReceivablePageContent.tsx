import { listAccountsReceivableForGridAction } from "@/features/accounting-accounts-receivable/actions/accounts-receivable.action";
import { parseAccountsReceivableFilters } from "./lib/parse-accounts-receivable-filters";
import AccountsReceivableDataGrid from "./ui/AccountsReceivableDataGrid";

export default async function AccountsReceivablePageContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAccountsReceivableFilters(sp);
  const { rows, total } = await listAccountsReceivableForGridAction(filters);

  return <AccountsReceivableDataGrid rows={rows} total={total} />;
}
