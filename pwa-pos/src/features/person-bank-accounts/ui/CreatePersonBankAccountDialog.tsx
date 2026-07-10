"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Dialog, Select, Switch, TextField } from "@kai/ui";
import {
  ACCOUNT_TYPE_OPTIONS,
  BANK_OPTIONS,
  accountTypeOptionsForBank,
} from "../lib/bank-account-options";
import { addPersonBankAccountAction } from "../actions/person-bank-account.action";
import type { PersonBankAccountItem } from "../types/person-bank-account.types";

type Props = {
  open: boolean;
  personId: string;
  onClose: () => void;
  onSuccess?: (accounts: PersonBankAccountItem[]) => void;
  title?: string;
  "data-test-id"?: string;
};

export function CreatePersonBankAccountDialog({
  open,
  personId,
  onClose,
  onSuccess,
  title,
  "data-test-id": dataTestId,
}: Props) {
  const defaultBank = useMemo(() => String(BANK_OPTIONS[0]?.id ?? ""), []);
  const defaultType = useMemo(() => String(ACCOUNT_TYPE_OPTIONS[0]?.id ?? ""), []);

  const [bankName, setBankName] = useState(defaultBank);
  const [accountType, setAccountType] = useState(defaultType);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeOptionsForBank = useMemo(() => accountTypeOptionsForBank(bankName), [bankName]);

  const reset = useCallback(() => {
    setBankName(defaultBank);
    setAccountType(defaultType);
    setAccountNumber("");
    setAccountHolderName("");
    setIsPrimary(false);
    setError(null);
  }, [defaultBank, defaultType]);

  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  useEffect(() => {
    const allowed = typeOptionsForBank.map((o) => String(o.id));
    if (!allowed.includes(accountType)) {
      setAccountType(allowed[0] ?? defaultType);
    }
  }, [bankName, typeOptionsForBank, accountType, defaultType]);

  function handleClose() {
    if (!busy) {
      reset();
      onClose();
    }
  }

  async function handleSubmit() {
    setError(null);
    const num = accountNumber.trim();
    if (!personId.trim()) {
      setError("No hay persona asociada al cliente.");
      return;
    }
    if (!bankName || !accountType || !num) {
      setError("Complete banco, tipo y número de cuenta.");
      return;
    }
    setBusy(true);
    try {
      const r = await addPersonBankAccountAction(personId.trim(), {
        bankName,
        accountType,
        accountNumber: num,
        accountHolderName: accountHolderName.trim() || undefined,
        isPrimary,
      });
      if (!r.success) {
        setError(r.error);
        return;
      }
      reset();
      onClose();
      onSuccess?.(r.accounts);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={title ?? "Nueva cuenta bancaria"}
      size="md"
      scroll="paper"
      hideActions
      data-test-id={dataTestId ?? "create-person-bank-account-dialog"}
    >
      <div className="flex flex-col gap-4 pt-1">
        {error ? (
          <Alert variant="error" data-test-id="create-person-bank-error">
            {error}
          </Alert>
        ) : null}
        <Select
          label="Banco"
          name="person-bank-name"
          placeholder="Seleccionar"
          options={BANK_OPTIONS}
          value={bankName}
          onChange={(id) => setBankName(id != null ? String(id) : defaultBank)}
          alwaysShowLabel
          disabled={busy}
          data-test-id="create-person-bank-bank"
        />
        <Select
          label="Tipo de cuenta"
          name="person-bank-type"
          placeholder="Seleccionar"
          options={typeOptionsForBank}
          value={accountType}
          onChange={(id) =>
            setAccountType(id != null ? String(id) : String(typeOptionsForBank[0]?.id ?? defaultType))
          }
          alwaysShowLabel
          disabled={busy}
          data-test-id="create-person-bank-type"
        />
        <TextField
          label="Número de cuenta"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          disabled={busy}
          data-test-id="create-person-bank-number"
        />
        <TextField
          label="Titular (opcional)"
          value={accountHolderName}
          onChange={(e) => setAccountHolderName(e.target.value)}
          disabled={busy}
          data-test-id="create-person-bank-holder"
        />
        <Switch
          checked={isPrimary}
          onChange={(v) => setIsPrimary(v)}
          disabled={busy}
          label="Marcar como cuenta principal"
          labelPosition="right"
          data-test-id="create-person-bank-primary"
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outlined" type="button" disabled={busy} onClick={handleClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="button" loading={busy} onClick={() => void handleSubmit()}>
            Guardar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
