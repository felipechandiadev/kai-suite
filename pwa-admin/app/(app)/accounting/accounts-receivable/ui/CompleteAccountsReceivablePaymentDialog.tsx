"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { Select, type Option } from "@kai/ui";
import { TextField } from "@kai/ui";
import {
  completeAccountsReceivablePaymentAction,
  getAccountsReceivablePaymentContextAction,
} from "@/features/accounting-accounts-receivable/actions/accounts-receivable.action";
import type {
  AccountsReceivablePaymentContext,
  AccountsReceivableRow,
} from "@/features/accounting-accounts-receivable/types/accounts-receivable.types";
import type { CashHubRow } from "@/features/treasury-cash-hubs/types/cash-hub.types";

type CompleteAccountsReceivablePaymentDialogProps = {
  open: boolean;
  row: AccountsReceivableRow | null;
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

async function fetchCashHubsForPurchasing(): Promise<CashHubRow[]> {
  const res = await fetch("/api/treasury/cash-hubs/purchasing", {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = (await res.json().catch(() => [])) as unknown;
  return Array.isArray(json) ? (json as CashHubRow[]) : [];
}

export default function CompleteAccountsReceivablePaymentDialog({
  open,
  row,
  onClose,
  onSuccess,
}: CompleteAccountsReceivablePaymentDialogProps) {
  const [context, setContext] = useState<AccountsReceivablePaymentContext | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "CHECK">("TRANSFER");
  const [companyAccountKey, setCompanyAccountKey] = useState<string | null>(null);
  const [cashHubId, setCashHubId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [cashHubs, setCashHubs] = useState<CashHubRow[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !row?.id) {
      setContext(null);
      setError(null);
      setNote("");
      setCompanyAccountKey(null);
      setCashHubId(null);
      setPaymentMethod("TRANSFER");
      setAmount("");
      return;
    }
    setLoading(true);
    getAccountsReceivablePaymentContextAction(row.id)
      .then((ctx) => {
        setContext(ctx);
        const pm = ctx.payment.paymentMethod;
        if (pm === "CASH" || pm === "TRANSFER" || pm === "CHECK") {
          setPaymentMethod(pm);
        }
        const pending = ctx.payment.pendingAmount ?? row.pendingAmount ?? 0;
        setAmount(String(pending));
        const firstCompanyKey = String(
          (ctx.companyAccounts?.[0] as Record<string, unknown> | undefined)?.accountKey ?? "",
        ).trim();
        if (firstCompanyKey) {
          setCompanyAccountKey(firstCompanyKey);
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "No se pudo cargar el cobro.");
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

  const cashHubOptions: Option[] = useMemo(
    () => cashHubs.map((h) => ({ id: h.id, label: h.name })),
    [cashHubs],
  );

  const pending = context?.payment.pendingAmount ?? row?.pendingAmount ?? 0;

  const handleSubmit = () => {
    if (!row?.id) return;
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Indique un monto válido.");
      return;
    }
    if (parsedAmount > pending) {
      setError("El monto supera el saldo pendiente.");
      return;
    }
    if (paymentMethod === "TRANSFER" && !companyAccountKey) {
      setError("Seleccione la cuenta bancaria de la empresa.");
      return;
    }
    if (paymentMethod === "CHECK" && !companyAccountKey) {
      setError("Seleccione la cuenta bancaria de la empresa.");
      return;
    }
    if (paymentMethod === "CASH" && !cashHubId?.trim()) {
      setError("Seleccione el centro de efectivo donde ingresará el dinero.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await completeAccountsReceivablePaymentAction({
        installmentId: row.id,
        paymentMethod,
        companyAccountKey: companyAccountKey ?? undefined,
        cashHubId: cashHubId ?? undefined,
        note: note.trim() || undefined,
        amount: parsedAmount,
      });
      if (res.success) {
        onSuccess?.();
        onClose();
      } else {
        setError(res.error);
      }
    });
  };

  const installmentLabel = useMemo(() => {
    const n = context?.payment.installmentNumber ?? row?.installmentNumber;
    const t = context?.payment.totalInstallments ?? row?.totalInstallments;
    if (!t || t <= 1) return "Cuota única";
    return `Cuota ${n}/${t}`;
  }, [context, row]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Registrar cobro"
      size="md"
      data-test-id="complete-accounts-receivable-payment-dialog"
      alertArea={error ? <Alert variant="error">{error}</Alert> : null}
      actions={
        <>
          <Button variant="outlined" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || loading || !row}>
            {isPending ? "Guardando…" : "Confirmar cobro"}
          </Button>
        </>
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Cliente: </span>
              {context?.payment.customerName ?? row?.customerName ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Folio venta: </span>
              {context?.payment.documentNumber ?? row?.documentNumber ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">{installmentLabel}: </span>
              pendiente <strong>{fmtClp(pending)}</strong>
            </p>
          </div>
          <TextField
            label="Monto a cobrar"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            data-test-id="ar-complete-amount"
          />
          <Select
            label="Medio de cobro"
            value={paymentMethod}
            onChange={(id) => setPaymentMethod((id as "CASH" | "TRANSFER" | "CHECK") ?? "TRANSFER")}
            options={[
              { id: "TRANSFER", label: "Transferencia" },
              { id: "CASH", label: "Efectivo" },
              { id: "CHECK", label: "Cheque" },
            ]}
            data-test-id="ar-complete-payment-method"
          />
          {paymentMethod === "TRANSFER" || paymentMethod === "CHECK" ? (
            <Select
              label="Cuenta empresa"
              value={companyAccountKey}
              onChange={(id) => setCompanyAccountKey(id == null ? null : String(id))}
              options={companyAccountOptions}
              placeholder={
                companyAccountOptions.length ? "Seleccione cuenta" : "Sin cuentas en empresa"
              }
              disabled={companyAccountOptions.length === 0}
              data-test-id="ar-complete-company-account"
            />
          ) : null}
          {paymentMethod === "CASH" ? (
            <Select
              label="Centro de efectivo"
              value={cashHubId}
              onChange={(id) => setCashHubId(id == null ? null : String(id))}
              options={cashHubOptions}
              placeholder={cashHubOptions.length ? "Seleccione centro" : "No hay centros configurados"}
              data-test-id="ar-complete-cash-hub"
            />
          ) : null}
          <TextField
            label="Nota (opcional)"
            type="textarea"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            data-test-id="ar-complete-note"
          />
        </div>
      )}
    </Dialog>
  );
}
