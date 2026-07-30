"use client";

import { LoadingState } from "@kai/ui";
import type { SupplierDetailView } from "@/features/purchasing-suppliers/types/supplier.types";
import { PersonBankAccountsSection } from "@/features/person-bank-accounts/ui/PersonBankAccountsSection";
import type { PersonBankAccountItem } from "@/features/person-bank-accounts/types/person-bank-account.types";

export function SupplierDetailBankAccountsSection({
  detail,
  loading,
  onDetailUpdated,
}: {
  detail: SupplierDetailView | null;
  loading: boolean;
  onDetailUpdated: (supplier: SupplierDetailView) => void;
}) {
  if (loading) {
    return <LoadingState className="flex items-center justify-center py-8" label="Cargando cuentas bancarias" />;
  }

  if (!detail?.personId) {
    return (
      <p className="text-sm text-muted-foreground" data-test-id="supplier-detail-bank-no-person">
        No hay persona asociada al proveedor.
      </p>
    );
  }

  const accounts = detail.person?.bankAccounts ?? [];

  function handleAccountsChange(next: PersonBankAccountItem[]) {
    if (!detail) return;
    onDetailUpdated({
      ...detail,
      person: detail.person
        ? { ...detail.person, bankAccounts: next }
        : {
            id: detail.personId,
            type: "NATURAL",
            firstName: "",
            bankAccounts: next,
          },
    });
  }

  return (
    <PersonBankAccountsSection
      personId={detail.personId}
      accounts={accounts}
      onAccountsChange={handleAccountsChange}
      testIdPrefix="supplier-detail"
    />
  );
}
