import { listAccountsReceivableForGridAction } from "@/features/accounting-accounts-receivable/actions/accounts-receivable.action";
import { parseAccountsReceivableFilters } from "./lib/parse-accounts-receivable-filters";
import AccountsReceivableCalendarPanel from "./ui/AccountsReceivableCalendarPanel";

export default async function AccountsReceivableCalendarPageContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAccountsReceivableFilters(sp, { calendar: true });
  const { rows } = await listAccountsReceivableForGridAction(filters);

  return <AccountsReceivableCalendarPanel rows={rows} />;
}
