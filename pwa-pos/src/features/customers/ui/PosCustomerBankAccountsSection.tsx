"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, IconButton } from "@/shared/admin-shared";
import { listPersonBankAccountsAction } from "@/features/person-bank-accounts/actions/person-bank-account.action";
import { CreatePersonBankAccountDialog } from "@/features/person-bank-accounts/ui/CreatePersonBankAccountDialog";
import { PersonBankAccountCard } from "@/features/person-bank-accounts/ui/PersonBankAccountCard";
import type { PersonBankAccountItem } from "@/features/person-bank-accounts/types/person-bank-account.types";

function SectionShell({
  title,
  action,
  children,
  testId,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section
      className="rounded-xl border border-border bg-background p-4 shadow-sm"
      data-test-id={testId}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

type Props = {
  personId: string;
};

export function PosCustomerBankAccountsSection({ personId }: Props) {
  const [accounts, setAccounts] = useState<PersonBankAccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const canAdd = Boolean(personId.trim());

  useEffect(() => {
    const id = personId.trim();
    if (!id) {
      setAccounts([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void listPersonBankAccountsAction(id).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success) {
        setAccounts(res.accounts);
      } else {
        setError(res.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [personId]);

  const sortedAccounts = useMemo(() => {
    const copy = [...accounts];
    copy.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return a.bankName.localeCompare(b.bankName, "es");
    });
    return copy;
  }, [accounts]);

  return (
    <SectionShell
      title="Cuentas bancarias"
      testId="pos-customer-detail-bank-accounts"
      action={
        canAdd ? (
          <IconButton
            icon="Plus"
            variant="action"
            size="sm"
            ariaLabel="Agregar cuenta bancaria"
            title="Agregar cuenta bancaria"
            onClick={() => setDialogOpen(true)}
            data-test-id="pos-customer-detail-bank-add"
          />
        ) : null
      }
    >
      {!canAdd ? (
        <p className="text-sm text-muted-foreground" data-test-id="pos-customer-detail-bank-no-person">
          No hay persona asociada al cliente.
        </p>
      ) : null}

      {canAdd && loading ? (
        <p className="text-sm text-muted-foreground">Cargando cuentas bancarias…</p>
      ) : null}

      {canAdd && !loading && error ? (
        <Alert variant="error" className="text-sm" data-test-id="pos-customer-detail-bank-error">
          {error}
        </Alert>
      ) : null}

      {canAdd && !loading && !error && sortedAccounts.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-test-id="pos-customer-detail-bank-empty">
          Sin cuentas bancarias registradas. Usa el botón + para agregar una.
        </p>
      ) : null}

      {canAdd && !loading && !error && sortedAccounts.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {sortedAccounts.map((a) => (
            <PersonBankAccountCard
              key={a.accountKey ?? `${a.bankName}-${a.accountNumber}`}
              account={a}
              data-test-id={
                a.accountKey
                  ? `pos-customer-detail-bank-card-${a.accountKey}`
                  : "pos-customer-detail-bank-card"
              }
            />
          ))}
        </div>
      ) : null}

      {canAdd ? (
        <CreatePersonBankAccountDialog
          open={dialogOpen}
          personId={personId}
          onClose={() => setDialogOpen(false)}
          onSuccess={setAccounts}
          data-test-id="pos-customer-detail-create-bank-account-dialog"
        />
      ) : null}
    </SectionShell>
  );
}
