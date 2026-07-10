"use client";

import { useEffect, useMemo, useState } from "react";
import { IconButton } from "@kai/ui";
import type { PersonBankAccountItem } from "../types/person-bank-account.types";
import { PersonBankAccountCard } from "./PersonBankAccountCard";
import { CreatePersonBankAccountDialog } from "./CreatePersonBankAccountDialog";

type PersonBankAccountsSectionProps = {
  personId: string;
  accounts: PersonBankAccountItem[];
  onAccountsChange: (accounts: PersonBankAccountItem[]) => void;
  /** Prefijo para `data-test-id` (p. ej. `supplier-detail`, `customer-detail`). */
  testIdPrefix?: string;
};

export function PersonBankAccountsSection({
  personId,
  accounts,
  onAccountsChange,
  testIdPrefix = "person-detail",
}: PersonBankAccountsSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [localAccounts, setLocalAccounts] = useState(accounts);
  const canAdd = Boolean(personId.trim());

  useEffect(() => {
    setLocalAccounts(accounts);
  }, [accounts]);

  const sortedAccounts = useMemo(() => {
    const copy = [...localAccounts];
    copy.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return a.bankName.localeCompare(b.bankName, "es");
    });
    return copy;
  }, [localAccounts]);

  function handleAccountsUpdated(next: PersonBankAccountItem[]) {
    setLocalAccounts(next);
    onAccountsChange(next);
  }

  return (
    <>
      <section
        className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6"
        data-test-id={`${testIdPrefix}-bank-accounts-section`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Cuentas bancarias</h2>
          <IconButton
            icon="Plus"
            variant="action"
            size="md"
            ariaLabel="Agregar cuenta bancaria"
            disabled={!canAdd}
            onClick={() => setDialogOpen(true)}
            data-test-id={`${testIdPrefix}-bank-add`}
          />
        </div>

        {!canAdd ? (
          <p className="text-sm text-muted-foreground">Las cuentas bancarias requieren una persona asociada.</p>
        ) : sortedAccounts.length === 0 ? null : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedAccounts.map((a) => (
              <PersonBankAccountCard
                key={a.accountKey ?? `${a.bankName}-${a.accountNumber}`}
                account={a}
                data-test-id={
                  a.accountKey
                    ? `${testIdPrefix}-bank-card-${a.accountKey}`
                    : `${testIdPrefix}-bank-card`
                }
              />
            ))}
          </div>
        )}
      </section>

      <CreatePersonBankAccountDialog
        open={dialogOpen}
        personId={personId}
        onClose={() => setDialogOpen(false)}
        onSuccess={handleAccountsUpdated}
        data-test-id={`${testIdPrefix}-create-bank-account-dialog`}
      />
    </>
  );
}
