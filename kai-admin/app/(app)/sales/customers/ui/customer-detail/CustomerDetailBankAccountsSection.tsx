"use client";

import { useEffect, useState } from "react";
import { LoadingState } from "@kai/ui";
import { listPersonBankAccountsAction } from "@/features/person-bank-accounts/actions/person-bank-account.action";
import { PersonBankAccountsSection } from "@/features/person-bank-accounts/ui/PersonBankAccountsSection";
import type { PersonBankAccountItem } from "@/features/person-bank-accounts/types/person-bank-account.types";

export function CustomerDetailBankAccountsSection({
  personId,
  loading,
}: {
  personId: string;
  loading: boolean;
}) {
  const [accounts, setAccounts] = useState<PersonBankAccountItem[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = personId.trim();
    if (!id || loading) {
      return;
    }
    let cancelled = false;
    setFetchLoading(true);
    setError(null);
    void listPersonBankAccountsAction(id).then((res) => {
      if (cancelled) return;
      setFetchLoading(false);
      if (res.success) {
        setAccounts(res.accounts);
      } else {
        setError(res.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [personId, loading]);

  if (loading || fetchLoading) {
    return <LoadingState className="flex items-center justify-center py-8" label="Cargando cuentas bancarias" />;
  }

  if (error) {
    return (
      <p className="text-sm text-error" role="alert" data-test-id="customer-detail-bank-error">
        {error}
      </p>
    );
  }

  if (!personId.trim()) {
    return (
      <p className="text-sm text-muted-foreground" data-test-id="customer-detail-bank-no-person">
        No hay persona asociada al cliente.
      </p>
    );
  }

  return (
    <PersonBankAccountsSection
      personId={personId}
      accounts={accounts}
      onAccountsChange={setAccounts}
      testIdPrefix="customer-detail"
    />
  );
}
