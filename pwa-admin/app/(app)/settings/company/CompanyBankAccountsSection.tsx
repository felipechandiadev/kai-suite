"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton } from "@kai/ui";
import Badge from "@kai/ui";
import type { CompanyBankAccountItem, CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import { CreateCompanyBankAccountDialog } from "./CreateCompanyBankAccountDialog";

function formatMoney(n?: number): string {
  if (n == null || !Number.isFinite(n)) {
    return "—";
  }
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function BankAccountCard({ account }: { account: CompanyBankAccountItem }) {
  return (
    <article
      className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4 shadow-sm"
      data-test-id={account.accountKey ? `company-bank-card-${account.accountKey}` : "company-bank-card"}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">{account.bankName}</h3>
        {account.isPrimary ? <Badge variant="success-outlined">Principal</Badge> : null}
      </div>
      <dl className="grid gap-1 text-sm text-foreground">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Tipo</dt>
          <dd>{account.accountType}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Número</dt>
          <dd className="font-mono tabular-nums">{account.accountNumber}</dd>
        </div>
        {account.accountHolderName ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Titular</dt>
            <dd>{account.accountHolderName}</dd>
          </div>
        ) : null}
        {account.currentBalance != null ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Saldo</dt>
            <dd>{formatMoney(account.currentBalance)}</dd>
          </div>
        ) : null}
        {account.notes ? (
          <div className="mt-1 border-t border-border pt-2 text-xs text-muted-foreground">{account.notes}</div>
        ) : null}
      </dl>
    </article>
  );
}

type Props = {
  company: CompanyDetails;
};

export function CompanyBankAccountsSection({ company }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const accounts = useMemo(() => company.bankAccounts ?? [], [company.bankAccounts]);
  const canAdd = Boolean(company.id);

  return (
    <>
      <section
        className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6"
        data-test-id="settings-company-bank-accounts-section"
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
            data-test-id="settings-company-bank-add"
          />
        </div>

        {!canAdd ? (
          <p className="text-sm text-muted-foreground">Las cuentas bancarias requieren una empresa registrada.</p>
        ) : accounts.length === 0 ? null : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {accounts.map((a) => (
              <BankAccountCard key={a.accountKey ?? `${a.bankName}-${a.accountNumber}`} account={a} />
            ))}
          </div>
        )}
      </section>

      <CreateCompanyBankAccountDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
