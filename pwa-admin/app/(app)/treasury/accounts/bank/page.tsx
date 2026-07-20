import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CompanyRequest } from "@/features/settings-branches/infrastructure/company.request";
import { CashHubsRequest } from "@/features/treasury-cash-hubs/infrastructure/cash-hubs.request";
import { ShareholderRequest } from "@/features/settings-shareholders/infrastructure/shareholder.request";
import { TreasuryBankMovementsRequest } from "@/features/treasury-bank-operations/infrastructure/treasury-bank-movements.request";
import TreasuryBankTabContent from "./TreasuryBankTabContent";
import { resolveTreasuryBankAccountSelection } from "./treasury-bank-accounts";
import {
  applyRunningSaldo,
  mapApiTxToMovementGridRow,
  type TreasuryMovementGridRow,
} from "./treasury-movements-mapper";
import type { TreasuryBankMovementApiRow } from "@/features/treasury-bank-operations/infrastructure/treasury-bank-movements.request";
import { LoadingState } from "@kai/ui";

export const dynamic = "force-dynamic";

export default async function TreasuryBankPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const company = await CompanyRequest.getDetails();
  const shareholders = company?.id ? await ShareholderRequest.list(company.id) : [];
  const cashHubs = company?.id ? await CashHubsRequest.list(company.id) : [];
  const accounts = company?.bankAccounts ?? [];

  const sp = await searchParams;
  const raw = sp.bankAccount;
  const bankAccountParam = Array.isArray(raw) ? raw[0] : raw;
  const { selectedKey, mustRedirect } = resolveTreasuryBankAccountSelection(accounts, bankAccountParam);

  if (mustRedirect && selectedKey) {
    redirect(`/treasury/accounts/bank?bankAccount=${encodeURIComponent(selectedKey)}`);
  }

  let movementRows: TreasuryMovementGridRow[] = [];
  let movementsTotal = 0;
  let bookBalance: number | null = null;
  let bookBalanceError: string | null = null;
  let apiRows: TreasuryBankMovementApiRow[] = [];

  if (selectedKey) {
    const [movementsResult, bookBalanceResult] = await Promise.allSettled([
      TreasuryBankMovementsRequest.listByBankAccountKey({
        bankAccountKey: selectedKey,
        page: 1,
        limit: 200,
      }),
      CompanyRequest.getBankAccountBookBalance(selectedKey),
    ]);

    if (movementsResult.status === "fulfilled") {
      apiRows = movementsResult.value.rows;
      movementRows = apiRows.map(mapApiTxToMovementGridRow);
      movementsTotal = movementsResult.value.total;
    }
    if (bookBalanceResult.status === "fulfilled") {
      bookBalance = bookBalanceResult.value.bookBalance;
    } else {
      bookBalanceError =
        bookBalanceResult.reason instanceof Error
          ? bookBalanceResult.reason.message
          : "No se pudo calcular el saldo libro";
    }
    if (bookBalance !== null) {
      movementRows = applyRunningSaldo(movementRows, apiRows, bookBalance);
    }
  }

  return (
    <Suspense
      fallback={
        <LoadingState
          className="flex items-center justify-center p-4 py-4"
          data-test-id="treasury-bank-page-suspense"
        />
      }
    >
      <TreasuryBankTabContent
        company={company}
        shareholders={shareholders}
        cashHubs={cashHubs}
        selectedBankAccountKey={selectedKey}
        movementRows={movementRows}
        movementsTotal={movementsTotal}
        bookBalance={bookBalance}
        bookBalanceError={bookBalanceError}
      />
    </Suspense>
  );
}
