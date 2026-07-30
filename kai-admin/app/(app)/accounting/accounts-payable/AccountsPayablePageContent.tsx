import { listAccountsPayableAction } from "@/features/accounting-accounts-payable/actions/accounts-payable.action";
import { parseAccountsPayableFilters } from "./lib/parse-accounts-payable-filters";
import AccountsPayableDataGrid from "./ui/AccountsPayableDataGrid";

export default async function AccountsPayablePageContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAccountsPayableFilters(sp);
  const { items } = await listAccountsPayableAction(filters);

  return <AccountsPayableDataGrid rows={items} />;
}
