"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { Select, type Option } from "@kai/ui";
import { TextField } from "@kai/ui";
import { IconButton } from "@kai/ui";
import {
  completeAccountsPayablePaymentAction,
  getAccountsPayablePaymentContextAction,
} from "@/features/accounting-accounts-payable/actions/accounts-payable.action";
import type {
  AccountsPayablePaymentContext,
  AccountsPayableRow,
} from "@/features/accounting-accounts-payable/types/accounts-payable.types";
import type { CashHubRow } from "@/features/treasury-cash-hubs/types/cash-hub.types";
import { CreatePersonBankAccountDialog } from "@/features/person-bank-accounts/ui/CreatePersonBankAccountDialog";

type CompleteAccountsPayablePaymentDialogProps = {
  open: boolean;
  row: AccountsPayableRow | null;
  onClose: () => void;
  onSuccess?: () => void;
};

function fmtClp(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function accountLabel(acc: Record<string, unknown>): string {
  const bankName = String(acc.bankName ?? "").trim();
  const accountType = String(acc.accountType ?? "").trim();
  const accountNumber = String(acc.accountNumber ?? "").trim();
  const holder = String(acc.accountHolderName ?? "").trim();
  const key = String(acc.accountKey ?? "").trim();
  const left = [bankName, accountType].filter(Boolean).join(" · ");
  const mid = accountNumber ? `N° ${accountNumber}` : "";
  const right = holder ? `(${holder})` : "";
  return [left, mid, right].filter(Boolean).join(" ") || key || "Cuenta";
}

function readCheckPrefill(row: AccountsPayableRow | null, dueDate?: string | null) {
  const meta = (row?.metadata ?? {}) as Record<string, unknown>;
  const line = meta.settlementPaymentLine as Record<string, unknown> | undefined;
  const cd = meta.checkData as Record<string, unknown> | undefined;
  const due =
    String(line?.dueDate ?? cd?.dueDate ?? dueDate ?? "").trim().slice(0, 10) || "";
  return {
    chequeNumber: String(line?.chequeNumber ?? cd?.checkNumber ?? "").trim(),
    drawerName: String(cd?.drawerName ?? "").trim(),
    dueDate: due,
  };
}

async function fetchCashHubsForPurchasing(): Promise<CashHubRow[]> {
  const res = await fetch("/api/treasury/cash-hubs/purchasing", {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = (await res.json().catch(() => [])) as unknown;
  return Array.isArray(json) ? (json as CashHubRow[]) : [];
}

export default function CompleteAccountsPayablePaymentDialog({
  open,
  row,
  onClose,
  onSuccess,
}: CompleteAccountsPayablePaymentDialogProps) {
  const [context, setContext] = useState<AccountsPayablePaymentContext | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "CHECK">("TRANSFER");
  const [bankAccountKey, setBankAccountKey] = useState<string | null>(null);
  const [destAccountKey, setDestAccountKey] = useState<string | null>(null);
  const [cashHubId, setCashHubId] = useState<string | null>(null);
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDrawerName, setChequeDrawerName] = useState("");
  const [chequeDueDate, setChequeDueDate] = useState("");
  const [cashHubs, setCashHubs] = useState<CashHubRow[]>([]);
  const [supplierPersonId, setSupplierPersonId] = useState<string | null>(null);
  const [addDestOpen, setAddDestOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !row?.id) {
      setContext(null);
      setError(null);
      setNote("");
      setBankAccountKey(null);
      setDestAccountKey(null);
      setCashHubId(null);
      setSupplierPersonId(null);
      setAddDestOpen(false);
      setPaymentMethod("TRANSFER");
      setChequeNumber("");
      setChequeDrawerName("");
      setChequeDueDate("");
      return;
    }
    setLoading(true);
    getAccountsPayablePaymentContextAction(row.id)
      .then((ctx) => {
        setContext(ctx);
        const pid =
          ctx.payment.payeePersonId != null && String(ctx.payment.payeePersonId).trim()
            ? String(ctx.payment.payeePersonId).trim()
            : "";
        if (pid) setSupplierPersonId(pid);
        const pm = ctx.payment.paymentMethod;
        if (pm === "CASH" || pm === "TRANSFER" || pm === "CHECK") {
          setPaymentMethod(pm);
        }
        const pre = readCheckPrefill(row, ctx.payment.dueDate);
        setChequeNumber(pre.chequeNumber);
        setChequeDrawerName(pre.drawerName);
        setChequeDueDate(pre.dueDate);
        const firstCompanyKey = String(
          (ctx.companyAccounts?.[0] as Record<string, unknown> | undefined)?.accountKey ?? "",
        ).trim();
        if (firstCompanyKey) {
          setBankAccountKey(firstCompanyKey);
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "No se pudo cargar el pago.");
      })
      .finally(() => setLoading(false));
  }, [open, row?.id, row]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const hubs = await fetchCashHubsForPurchasing();
      setCashHubs(Array.isArray(hubs) ? hubs : []);
      if (!cashHubId && Array.isArray(hubs) && hubs[0]?.id) {
        setCashHubId(String(hubs[0].id));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const companyAccountOptions: Option[] = useMemo(() => {
    return (context?.companyAccounts ?? []).map((acc, i) => {
      const key = String((acc as Record<string, unknown>).accountKey ?? i);
      return { id: key, label: accountLabel(acc as Record<string, unknown>) };
    });
  }, [context?.companyAccounts]);

  const supplierAccountOptions: Option[] = useMemo(() => {
    return (context?.supplierAccounts ?? []).map((acc, i) => {
      const key = String((acc as Record<string, unknown>).accountKey ?? i);
      return { id: key, label: accountLabel(acc as Record<string, unknown>) };
    });
  }, [context?.supplierAccounts]);

  const cashHubOptions: Option[] = useMemo(
    () => cashHubs.map((h) => ({ id: h.id, label: h.name })),
    [cashHubs],
  );

  const selectedCompanyAccount = useMemo(() => {
    if (!bankAccountKey) return null;
    return (context?.companyAccounts ?? []).find(
      (a) => String((a as Record<string, unknown>).accountKey ?? "") === String(bankAccountKey),
    ) as Record<string, unknown> | undefined;
  }, [context?.companyAccounts, bankAccountKey]);

  const handleSubmit = () => {
    if (!row?.id) return;
    if ((paymentMethod === "TRANSFER" || paymentMethod === "CHECK") && !bankAccountKey) {
      setError("Seleccione la cuenta bancaria de la empresa.");
      return;
    }
    if (paymentMethod === "TRANSFER" && (context?.supplierAccounts?.length ?? 0) > 0 && !destAccountKey) {
      setError("Seleccione la cuenta de destino.");
      return;
    }
    if (paymentMethod === "CHECK") {
      if (!chequeNumber.trim()) {
        setError("Indique el número de cheque.");
        return;
      }
      const bankName = String(selectedCompanyAccount?.bankName ?? "").trim();
      if (!bankName) {
        setError("La cuenta empresa seleccionada no tiene banco asociado.");
        return;
      }
    }
    if (paymentMethod === "CASH" && !cashHubId?.trim()) {
      setError("Seleccione el centro de efectivo (cash hub) desde donde saldrá el dinero.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const originAcc = selectedCompanyAccount ?? null;
      const destAcc =
        (context?.supplierAccounts ?? []).find(
          (a) => String((a as Record<string, unknown>).accountKey ?? "") === String(destAccountKey ?? ""),
        ) ?? null;
      const payeeName =
        context?.payment.payeeName ?? row?.payeeName ?? undefined;
      const bankName = String(selectedCompanyAccount?.bankName ?? "").trim();

      const res = await completeAccountsPayablePaymentAction({
        paymentId: row.id,
        paymentMethod,
        bankAccountKey: bankAccountKey ?? undefined,
        cashHubId: cashHubId ?? undefined,
        companyBankAccount: originAcc ?? undefined,
        supplierBankAccount: destAcc ?? undefined,
        note: note.trim() || undefined,
        checkData:
          paymentMethod === "CHECK"
            ? {
                checkNumber: chequeNumber.trim(),
                bankName,
                bankAccountKey: bankAccountKey ?? null,
                drawerName: chequeDrawerName.trim() || null,
                dueDate: chequeDueDate.trim() || null,
                payeeName: payeeName ?? null,
              }
            : undefined,
      });
      if (res.success) {
        onSuccess?.();
        onClose();
      } else {
        setError(res.error);
      }
    });
  };

  const pending = context?.payment.pendingAmount ?? row?.pendingAmount ?? 0;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title="Registrar pago"
        size="md"
        data-test-id="complete-accounts-payable-payment-dialog"
        alertArea={error ? <Alert variant="error">{error}</Alert> : null}
        actions={
          <>
            <Button variant="outlined" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || loading || !row}>
              {isPending ? "Guardando…" : "Confirmar pago"}
            </Button>
          </>
        }
      >
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Beneficiario: </span>
                {context?.payment.payeeName ?? row?.payeeName ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Documento: </span>
                {context?.payment.documentNumber ?? row?.documentNumber ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Monto a pagar: </span>
                <strong>{fmtClp(pending)}</strong>
              </p>
            </div>
            <Select
              label="Medio de pago"
              value={paymentMethod}
              onChange={(id) => setPaymentMethod((id as "CASH" | "TRANSFER" | "CHECK") ?? "TRANSFER")}
              options={[
                { id: "TRANSFER", label: "Transferencia" },
                { id: "CASH", label: "Efectivo" },
                { id: "CHECK", label: "Cheque" },
              ]}
              data-test-id="ap-complete-payment-method"
            />

            {paymentMethod === "TRANSFER" ? (
              <>
                <Select
                  label="Cuenta de origen"
                  value={bankAccountKey}
                  onChange={(id) => setBankAccountKey(id == null ? null : String(id))}
                  options={companyAccountOptions}
                  placeholder="Seleccione cuenta"
                  data-test-id="ap-complete-bank-account"
                />
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Select
                      label="Cuenta de destino"
                      value={destAccountKey}
                      onChange={(id) => setDestAccountKey(id == null ? null : String(id))}
                      options={supplierAccountOptions}
                      placeholder={
                        supplierAccountOptions.length ? "Seleccione cuenta" : "Sin cuentas de destino"
                      }
                      disabled={supplierAccountOptions.length === 0}
                      hideDropdownIcon={supplierAccountOptions.length === 0}
                      data-test-id="ap-complete-destination-account"
                    />
                  </div>
                  {supplierAccountOptions.length === 0 && row?.payeeType === "SUPPLIER" ? (
                    <IconButton
                      icon="Plus"
                      variant="action"
                      size="sm"
                      title="Agregar cuenta de destino"
                      ariaLabel="Agregar cuenta de destino"
                      onClick={() => setAddDestOpen(true)}
                      disabled={!supplierPersonId}
                      data-test-id="ap-complete-destination-add"
                    />
                  ) : null}
                </div>
              </>
            ) : null}

            {paymentMethod === "CHECK" ? (
              <div
                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                data-test-id="ap-complete-check-fields"
              >
                <div className="min-w-0 sm:col-span-2">
                  <Select
                    label="Cuenta empresa (cheque)"
                    value={bankAccountKey}
                    onChange={(id) => setBankAccountKey(id == null ? null : String(id))}
                    options={companyAccountOptions}
                    placeholder={
                      companyAccountOptions.length ? "Seleccione cuenta" : "Sin cuentas en empresa"
                    }
                    disabled={companyAccountOptions.length === 0}
                    data-test-id="ap-complete-check-company-account"
                  />
                </div>
                <div className="min-w-0">
                  <TextField
                    label="Número de cheque"
                    required
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    data-test-id="ap-complete-check-number"
                  />
                </div>
                <div className="min-w-0">
                  <TextField
                    label="Girador"
                    value={chequeDrawerName}
                    onChange={(e) => setChequeDrawerName(e.target.value)}
                    placeholder="Quien firma el cheque"
                    data-test-id="ap-complete-check-drawer"
                  />
                </div>
                <div className="min-w-0">
                  <TextField
                    label="A fecha (opcional)"
                    type="date"
                    value={chequeDueDate}
                    onChange={(e) => setChequeDueDate(e.target.value)}
                    data-test-id="ap-complete-check-due-date"
                  />
                </div>
              </div>
            ) : null}

            {paymentMethod === "CASH" ? (
              <Select
                label="Centro de efectivo"
                value={cashHubId}
                onChange={(id) => setCashHubId(id == null ? null : String(id))}
                options={cashHubOptions}
                placeholder={cashHubOptions.length ? "Seleccione centro" : "No hay centros configurados"}
                data-test-id="ap-complete-cash-hub"
              />
            ) : null}
            <TextField
              label="Nota (opcional)"
              type="textarea"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              data-test-id="ap-complete-note"
            />
          </div>
        )}
      </Dialog>
      {supplierPersonId ? (
        <CreatePersonBankAccountDialog
          open={addDestOpen}
          personId={supplierPersonId}
          onClose={() => setAddDestOpen(false)}
          title="Nueva cuenta corriente"
          initialAccountType="Cuenta Corriente"
          lockAccountType
          onSuccess={(accounts) => {
            setContext((prev) => {
              if (!prev) return prev;
              return { ...prev, supplierAccounts: accounts as Record<string, unknown>[] };
            });
            const first = accounts?.[0]?.accountKey;
            if (first) {
              setDestAccountKey(String(first));
            }
          }}
          data-test-id="ap-add-destination-bank-account-dialog"
        />
      ) : null}
    </>
  );
}
