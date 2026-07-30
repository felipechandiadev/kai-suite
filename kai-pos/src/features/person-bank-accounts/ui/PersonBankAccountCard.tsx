"use client";

import { Badge } from "@kai/ui";
import type { PersonBankAccountItem } from "../types/person-bank-account.types";

type PersonBankAccountCardProps = {
  account: PersonBankAccountItem;
  "data-test-id"?: string;
};

export function PersonBankAccountCard({ account, "data-test-id": dataTestId }: PersonBankAccountCardProps) {
  return (
    <article
      className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-3"
      data-test-id={dataTestId ?? (account.accountKey ? `person-bank-card-${account.accountKey}` : "person-bank-card")}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">{account.bankName}</h4>
        {account.isPrimary ? <Badge variant="success-outlined">Principal</Badge> : null}
      </div>
      <dl className="grid gap-1 text-xs text-foreground">
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
      </dl>
    </article>
  );
}
