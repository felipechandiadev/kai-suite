"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Select } from "@kai/ui";
import { Switch } from "@kai/ui";
import { Button } from "@kai/ui";
import { Alert } from "@kai/ui";
import {
  COMPANY_ACCOUNT_TYPE_OPTIONS,
  COMPANY_BANK_OPTIONS,
  accountTypeOptionsForBank,
} from "./company-bank-options";
import { addCompanyBankAccountAction } from "@/features/settings-company/actions/company.action";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function CreateCompanyBankAccountDialog({ open, onClose, onSuccess }: Props) {
  const defaultBank = useMemo(() => String(COMPANY_BANK_OPTIONS[0]?.id ?? ""), []);
  const defaultType = useMemo(() => String(COMPANY_ACCOUNT_TYPE_OPTIONS[0]?.id ?? ""), []);

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

  /** Si el banco no admite Cuenta RUT y estaba seleccionada, volver al primer tipo permitido. */
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
    if (!bankName || !accountType || !num) {
      setError("Complete banco, tipo y número de cuenta.");
      return;
    }
    setBusy(true);
    try {
      const r = await addCompanyBankAccountAction({
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
      onSuccess?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Nueva cuenta bancaria"
      size="md"
      scroll="paper"
      hideActions
      data-test-id="create-company-bank-account-dialog"
    >
      <div className="flex flex-col gap-4 pt-1">
        {error ? (
          <Alert variant="error" data-test-id="create-company-bank-error">
            {error}
          </Alert>
        ) : null}
        <Select
          label="Banco"
          name="company-bank-name"
          placeholder="Seleccionar"
          options={COMPANY_BANK_OPTIONS}
          value={bankName}
          onChange={(id) => setBankName(id != null ? String(id) : defaultBank)}
          alwaysShowLabel
          disabled={busy}
          data-test-id="create-company-bank-bank"
        />
        <Select
          label="Tipo de cuenta"
          name="company-bank-type"
          placeholder="Seleccionar"
          options={typeOptionsForBank}
          value={accountType}
          onChange={(id) => setAccountType(id != null ? String(id) : String(typeOptionsForBank[0]?.id ?? defaultType))}
          alwaysShowLabel
          disabled={busy}
          data-test-id="create-company-bank-type"
        />
        <TextField
          label="Número de cuenta"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          disabled={busy}
          data-test-id="create-company-bank-number"
        />
        <TextField
          label="Titular (opcional)"
          value={accountHolderName}
          onChange={(e) => setAccountHolderName(e.target.value)}
          disabled={busy}
          data-test-id="create-company-bank-holder"
        />
        <Switch
          checked={isPrimary}
          onChange={(v) => setIsPrimary(v)}
          disabled={busy}
          label="Marcar como cuenta principal"
          labelPosition="right"
          data-test-id="create-company-bank-primary"
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" type="button" disabled={busy} onClick={handleClose}>
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
