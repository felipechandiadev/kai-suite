"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import type { ShareholderRow } from "@/features/settings-shareholders/types/shareholder.types";
import type { CashHubRow } from "@/features/treasury-cash-hubs/types/cash-hub.types";
import { Alert, Button, Card, Dialog, IconButton, SelectDefault as Select, StatisticsCard, TextField, type LucideIconName, type Option } from "@kai/ui";
import {
  postCapitalContributionAction,
  postCashDepositAction,
  postDividendWithdrawalAction,
  postBankToCashHubTransferAction,
  updateBankAccountBalanceAction,
} from "@/features/treasury-bank-operations/actions/treasury-bank-operations.action";
import TreasuryBankMovementsGrid from "./TreasuryBankMovementsGrid";
import { treasuryBankAccountKey } from "./treasury-bank-accounts";
import type { TreasuryMovementGridRow } from "./treasury-movements-mapper";

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function partnerLabel(row: ShareholderRow): string {
  const p = row.person;
  return (
    p?.displayName?.trim() ||
    [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim() ||
    p?.businessName?.trim() ||
    "Socio"
  );
}

type TreasuryBankTabContentProps = {
  company: CompanyDetails | null;
  shareholders: ShareholderRow[];
  cashHubs: CashHubRow[];
  selectedBankAccountKey: string | null;
  movementRows: TreasuryMovementGridRow[];
  movementsTotal: number;
  bookBalance: number | null;
  bookBalanceError: string | null;
};

type DialogKind = "none" | "capital" | "dividend" | "deposit" | "bankToHub" | "reconcile";

const TREASURY_CARD_PAD = "[&_.fs-card__content]:p-2 [&_.fs-card__content]:pb-2";

function TreasuryTransactionCard({
  title,
  description,
  icon,
  ariaLabel,
  disabled,
  onOpen,
  "data-test-id": dataTestId,
}: {
  title: string;
  description: string;
  icon: LucideIconName;
  ariaLabel: string;
  disabled?: boolean;
  onOpen: () => void;
  "data-test-id"?: string;
}) {
  return (
    <Card
      className={TREASURY_CARD_PAD}
      content={
        <div className="grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] gap-x-2 gap-y-0.5">
          <h3 className="min-w-0 self-center text-sm font-semibold leading-tight text-foreground">{title}</h3>
          <p className="col-start-1 row-start-2 min-w-0 text-xs leading-snug text-muted-foreground">{description}</p>
          <div className="col-start-2 row-span-2 row-start-1 flex shrink-0 items-start justify-end self-start pt-0.5">
            <IconButton
              icon={icon}
              variant="action"
              size="sm"
              ariaLabel={ariaLabel}
              onClick={onOpen}
              disabled={disabled}
            />
          </div>
        </div>
      }
      data-test-id={dataTestId}
    />
  );
}

export default function TreasuryBankTabContent({
  company,
  shareholders,
  cashHubs,
  selectedBankAccountKey,
  movementRows,
  movementsTotal,
  bookBalance,
  bookBalanceError,
}: TreasuryBankTabContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dialog, setDialog] = useState<DialogKind>("none");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const accounts = company?.bankAccounts ?? [];
  const totalBank = useMemo(
    () => accounts.reduce((s, a) => s + (typeof a.currentBalance === "number" ? a.currentBalance : 0), 0),
    [accounts],
  );

  const bankOptions: Option[] = useMemo(
    () =>
      accounts.map((a) => ({
        id: treasuryBankAccountKey(a),
        label: `${a.bankName} · ${a.accountNumber}`,
      })),
    [accounts],
  );

  const partnerOptions: Option[] = useMemo(
    () =>
      shareholders.map((s) => ({
        id: s.id,
        label: `${partnerLabel(s)}${s.ownershipPercentage != null ? ` (${s.ownershipPercentage}%)` : ""}`,
      })),
    [shareholders],
  );

  const cashHubOptions: Option[] = useMemo(
    () =>
      cashHubs.map((h) => ({
        id: h.id,
        label: `${h.name} · ${fmtMoney(h.currentBalance ?? 0)}`,
      })),
    [cashHubs],
  );

  const [bankOpt, setBankOpt] = useState<string | null>(null);
  const [cashHubOpt, setCashHubOpt] = useState<string | null>(null);
  const [partnerOpt, setPartnerOpt] = useState<string | null>(null);
  const [amountStr, setAmountStr] = useState("0");
  const [taxStr, setTaxStr] = useState("");
  const [reconcileAmountStr, setReconcileAmountStr] = useState("");

  const preferredBankKey = useMemo(() => {
    if (
      selectedBankAccountKey &&
      bankOptions.some((o) => String(o.id) === String(selectedBankAccountKey))
    ) {
      return String(selectedBankAccountKey);
    }
    return bankOptions[0] != null ? String(bankOptions[0].id) : null;
  }, [bankOptions, selectedBankAccountKey]);

  const preferredCashHubId = useMemo(
    () => (cashHubOptions[0] != null ? String(cashHubOptions[0].id) : null),
    [cashHubOptions],
  );

  const resetForm = () => {
    setBankOpt(preferredBankKey);
    setCashHubOpt(preferredCashHubId);
    setPartnerOpt(partnerOptions[0] != null ? String(partnerOptions[0].id) : null);
    setAmountStr("0");
    setTaxStr("");
    setReconcileAmountStr("");
    setError(null);
  };

  useEffect(() => {
    if (dialog !== "none") {
      return;
    }
    setBankOpt(preferredBankKey);
  }, [dialog, preferredBankKey]);

  const selectBankAccount = useCallback(
    (key: string) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("bankAccount", key);
      p.delete("page");
      router.push(`${pathname}?${p.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const openDialog = (k: DialogKind) => {
    resetForm();
    setDialog(k);
  };

  const closeDialog = () => {
    if (pending) {
      return;
    }
    setDialog("none");
  };

  const amountNum = Math.max(0, Math.round(Number(amountStr) || 0));

  const submitCapital = () => {
    setError(null);
    if (!partnerOpt || !bankOpt || amountNum <= 0) {
      setError("Complete socio, cuenta y monto.");
      return;
    }
    startTransition(() => {
      void (async () => {
        const r = await postCapitalContributionAction({
          shareholderId: partnerOpt,
          bankAccountKey: bankOpt,
          amount: amountNum,
        });
        if (r.success) {
          closeDialog();
          router.refresh();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const submitDividend = () => {
    setError(null);
    if (!partnerOpt || !bankOpt || amountNum <= 0) {
      setError("Complete socio, cuenta y monto.");
      return;
    }
    const tax = taxStr.trim() === "" ? undefined : Math.max(0, Number(taxStr) || 0);
    startTransition(() => {
      void (async () => {
        const r = await postDividendWithdrawalAction({
          shareholderId: partnerOpt,
          bankAccountKey: bankOpt,
          amount: amountNum,
          taxRetention: tax,
        });
        if (r.success) {
          closeDialog();
          router.refresh();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const submitDeposit = () => {
    setError(null);
    if (!cashHubOpt || !bankOpt || amountNum <= 0) {
      setError("Seleccione centro de efectivo origen, cuenta bancaria destino y monto.");
      return;
    }
    const hub = cashHubs.find((h) => String(h.id) === String(cashHubOpt));
    const hubBalance = typeof hub?.currentBalance === "number" ? hub.currentBalance : 0;
    if (amountNum > hubBalance + 0.01) {
      setError(`El monto supera el saldo del centro de efectivo (${fmtMoney(hubBalance)}).`);
      return;
    }
    startTransition(() => {
      void (async () => {
        const r = await postCashDepositAction({
          bankAccountKey: bankOpt,
          cashHubId: cashHubOpt,
          amount: amountNum,
        });
        if (r.success) {
          closeDialog();
          router.refresh();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const submitBankToHub = () => {
    setError(null);
    if (!bankOpt || !cashHubOpt || amountNum <= 0) {
      setError("Seleccione cuenta bancaria origen, centro de efectivo destino y monto.");
      return;
    }
    startTransition(() => {
      void (async () => {
        const r = await postBankToCashHubTransferAction({
          bankAccountKey: bankOpt,
          cashHubId: cashHubOpt,
          amount: amountNum,
        });
        if (r.success) {
          closeDialog();
          router.refresh();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const submitReconcile = () => {
    setError(null);
    if (!selectedBankAccountKey) {
      setError("No hay cuenta bancaria seleccionada.");
      return;
    }
    const reconcileAmount = Math.round(Number(reconcileAmountStr) || 0);
    startTransition(() => {
      void (async () => {
        const r = await updateBankAccountBalanceAction({
          bankAccountKey: selectedBankAccountKey,
          currentBalance: reconcileAmount,
        });
        if (r.success) {
          closeDialog();
          router.refresh();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  if (!company?.id) {
    return (
      <p className="p-4 text-sm text-muted-foreground" data-test-id="treasury-bank-no-company">
        No hay empresa configurada.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-4 p-2 md:p-4" data-test-id="treasury-bank-tab-root">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <StatisticsCard
          compact
          label="Total en banco (cartola)"
          value={fmtMoney(totalBank)}
          hint="Suma de saldos cartola en cuentas activas"
          tone="primary"
          data-test-id="treasury-bank-total-card"
        />
        {bookBalance !== null ? (
          <StatisticsCard
            compact
            label="Saldo libro"
            value={fmtMoney(bookBalance)}
            hint="Calculado desde movimientos registrados en el sistema"
            tone={
              Math.abs(bookBalance - (accounts.find((a) => treasuryBankAccountKey(a) === selectedBankAccountKey)?.currentBalance ?? bookBalance)) > 1
                ? "warning"
                : "success"
            }
            data-test-id="treasury-bank-book-balance-card"
          />
        ) : null}

        <TreasuryTransactionCard
          title="Aporte de capital"
          description="Ingreso del socio a la cuenta bancaria; aumenta el capital social."
          icon="TrendingUp"
          ariaLabel="Registrar aporte de capital"
          onOpen={() => openDialog("capital")}
          disabled={partnerOptions.length === 0 || bankOptions.length === 0}
          data-test-id="treasury-bank-action-capital"
        />

        <TreasuryTransactionCard
          title="Retiro de utilidades"
          description="Pago desde el banco al socio; puede incluir retención u otro impuesto."
          icon="TrendingDown"
          ariaLabel="Registrar retiro de utilidades"
          onOpen={() => openDialog("dividend")}
          disabled={partnerOptions.length === 0 || bankOptions.length === 0}
          data-test-id="treasury-bank-action-dividend"
        />

        <TreasuryTransactionCard
          title="Depósito de efectivo"
          description="Depósito en banco desde un centro de efectivo (efectivo acopio → cuenta bancaria)."
          icon="Landmark"
          ariaLabel="Depositar desde centro de efectivo a banco"
          onOpen={() => openDialog("deposit")}
          disabled={bankOptions.length === 0 || cashHubOptions.length === 0}
          data-test-id="treasury-bank-action-deposit"
        />

        <TreasuryTransactionCard
          title="Giro para centro de efectivo"
          description="Transferencia desde cuenta bancaria hacia un centro de efectivo (centro de acopio)."
          icon="Wallet"
          ariaLabel="Giro de banco a centro de efectivo"
          onOpen={() => openDialog("bankToHub")}
          disabled={bankOptions.length === 0 || cashHubOptions.length === 0}
          data-test-id="treasury-bank-action-bank-to-hub"
        />

        <TreasuryTransactionCard
          title="Actualizar saldo cartola"
          description="Registra el saldo según extracto bancario para conciliar con el saldo libro."
          icon="BookCheck"
          ariaLabel="Actualizar saldo según cartola bancaria"
          onOpen={() => {
            const currentAccount = accounts.find(
              (a) => treasuryBankAccountKey(a) === selectedBankAccountKey,
            );
            setReconcileAmountStr(
              String(currentAccount?.currentBalance != null ? currentAccount.currentBalance : ""),
            );
            openDialog("reconcile");
          }}
          disabled={!selectedBankAccountKey}
          data-test-id="treasury-bank-action-reconcile"
        />
      </div>

      {bookBalanceError ? (
        <Alert variant="warning" data-test-id="treasury-bank-book-balance-error">
          No fue posible calcular el saldo libro. {bookBalanceError}
        </Alert>
      ) : null}

      {accounts.length > 0 ? (
        <section className="min-h-0 space-y-3" data-test-id="treasury-bank-accounts-section">
          <h2 className="text-sm font-semibold text-foreground">Cuentas</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((a) => {
              const key = treasuryBankAccountKey(a);
              const isSelected = selectedBankAccountKey != null && key === selectedBankAccountKey;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => selectBankAccount(key)}
                    className={[
                      "fs-treasury-pick-card w-full rounded-xl p-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      isSelected ? "fs-treasury-pick-card--selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-pressed={isSelected}
                    data-test-id={`treasury-bank-account-card-${key}`}
                    data-selected={isSelected || undefined}
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] gap-x-2 gap-y-0.5">
                      <div className="min-w-0 font-medium leading-tight">{a.bankName}</div>
                      <div className="col-start-1 row-start-2 min-w-0 text-xs leading-snug text-muted-foreground">
                        {a.accountNumber}
                        {a.isPrimary ? (
                          <span className="ml-1.5 text-[0.65rem] font-medium uppercase text-primary">
                            {" "}
                            · Principal
                          </span>
                        ) : null}
                      </div>
                      <div className="col-start-2 row-span-2 row-start-1 flex shrink-0 items-start justify-end self-start pt-0.5 text-right text-sm font-semibold tabular-nums leading-tight">
                        {fmtMoney(typeof a.currentBalance === "number" ? a.currentBalance : 0)}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {selectedBankAccountKey ? (
            <div className="min-h-0 pt-1" data-test-id="treasury-bank-movements-wrap">
              <TreasuryBankMovementsGrid rows={movementRows} total={movementsTotal} />
              {movementRows.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  No hay movimientos registrados para esta cuenta en el sistema.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">No hay cuentas bancarias en la empresa.</p>
      )}

      <Dialog
        open={dialog !== "none"}
        onClose={closeDialog}
        title={
          dialog === "capital"
            ? "Aporte de capital"
            : dialog === "dividend"
              ? "Retiro de utilidades"
              : dialog === "deposit"
                ? "Depósito de efectivo"
                : dialog === "bankToHub"
                  ? "Giro para centro de efectivo"
                  : dialog === "reconcile"
                    ? "Actualizar saldo cartola"
                    : ""
        }
        size="md"
        scroll="paper"
        alertArea={error ? <Alert variant="error">{error}</Alert> : null}
        actions={
          <>
            <Button variant="outlined" onClick={closeDialog} disabled={pending}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={pending}
              onClick={() => {
                if (dialog === "capital") {
                  submitCapital();
                } else if (dialog === "dividend") {
                  submitDividend();
                } else if (dialog === "deposit") {
                  submitDeposit();
                } else if (dialog === "bankToHub") {
                  submitBankToHub();
                } else if (dialog === "reconcile") {
                  submitReconcile();
                }
              }}
            >
              Registrar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {(dialog === "capital" || dialog === "dividend") && (
            <Select
              label="Socio"
              options={partnerOptions}
              value={partnerOpt}
              onChange={(id) => setPartnerOpt(id == null ? null : String(id).trim())}
              required
              placeholder="Seleccione socio"
            />
          )}
          {(dialog === "deposit" || dialog === "bankToHub") &&
            (cashHubOptions.length === 0 ? (
              <Alert variant="warning">
                No hay centros de efectivo configurados. Créelos en la pestaña Efectivo antes de registrar esta
                operación.
              </Alert>
            ) : (
              <Select
                label={
                  dialog === "deposit" ? "Centro de efectivo origen" : "Centro de efectivo destino"
                }
                options={cashHubOptions}
                value={cashHubOpt}
                onChange={(id) => setCashHubOpt(id == null ? null : String(id).trim())}
                required
                placeholder="Seleccione centro de efectivo"
              />
            ))}
          <Select
            label={
              dialog === "deposit"
                ? "Cuenta bancaria destino"
                : dialog === "bankToHub"
                  ? "Cuenta bancaria origen"
                  : "Cuenta bancaria"
            }
            options={bankOptions}
            value={bankOpt}
            onChange={(id) => setBankOpt(id == null ? null : String(id).trim())}
            required
            placeholder="Seleccione cuenta"
          />
          {dialog === "deposit" ? (
            <p className="text-xs text-muted-foreground">
              El efectivo sale del centro de acopio seleccionado y aumenta el saldo de la cuenta bancaria.
            </p>
          ) : null}
          {dialog !== "reconcile" ? (
            <TextField
              label="Monto"
              type="currency"
              currencySymbol="$"
              startSymbol="$"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              required
            />
          ) : null}
          {dialog === "dividend" ? (
            <TextField
              label="Retención / impuesto (opcional)"
              value={taxStr}
              onChange={(e) => setTaxStr(e.target.value)}
              placeholder="Monto CLP"
            />
          ) : null}

          {dialog === "reconcile" ? (
            <>
              {bookBalance !== null ? (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Saldo libro (sistema)</span>
                    <span className="font-semibold tabular-nums">{fmtMoney(bookBalance)}</span>
                  </div>
                </div>
              ) : null}
              <TextField
                label="Saldo según extracto bancario (cartola)"
                type="currency"
                currencySymbol="$"
                startSymbol="$"
                value={reconcileAmountStr}
                onChange={(e) => setReconcileAmountStr(e.target.value)}
                required
              />
              {bookBalance !== null && reconcileAmountStr.trim() !== "" ? (
                <p className="text-xs text-muted-foreground">
                  Diferencia:{" "}
                  <span
                    className={
                      Math.abs(
                        Math.round(Number(reconcileAmountStr) || 0) - bookBalance,
                      ) > 1
                        ? "font-semibold text-amber-600"
                        : "font-semibold text-green-600"
                    }
                  >
                    {fmtMoney(
                      Math.round(Number(reconcileAmountStr) || 0) - bookBalance,
                    )}
                  </span>
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Esto actualiza solo el saldo cartola registrado en el sistema. No crea transacciones ni
                asientos contables.
              </p>
            </>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}
