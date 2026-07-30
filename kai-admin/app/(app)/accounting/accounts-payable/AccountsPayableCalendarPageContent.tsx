import { listAccountsPayableAction } from "@/features/accounting-accounts-payable/actions/accounts-payable.action";
import { parseAccountsPayableFilters } from "./lib/parse-accounts-payable-filters";
import AccountsPayableCalendarPanel from "./ui/AccountsPayableCalendarPanel";

export default async function AccountsPayableCalendarPageContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAccountsPayableFilters(sp);
  const { items } = await listAccountsPayableAction(filters);

  return <AccountsPayableCalendarPanel rows={items} />;
}
