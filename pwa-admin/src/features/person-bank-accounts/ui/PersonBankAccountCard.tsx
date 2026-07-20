"use client";

import { Badge } from "@kai/ui";
import type { PersonBankAccountItem } from "../types/person-bank-account.types";

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

type PersonBankAccountCardProps = {
  account: PersonBankAccountItem;
  "data-test-id"?: string;
};

export function PersonBankAccountCard({ account, "data-test-id": dataTestId }: PersonBankAccountCardProps) {
  return (
    <article
      className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4 shadow-sm"
      data-test-id={dataTestId ?? (account.accountKey ? `person-bank-card-${account.accountKey}` : "person-bank-card")}
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
        {account.accountHolderRut ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">RUT titular</dt>
            <dd className="font-mono tabular-nums">{account.accountHolderRut}</dd>
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
