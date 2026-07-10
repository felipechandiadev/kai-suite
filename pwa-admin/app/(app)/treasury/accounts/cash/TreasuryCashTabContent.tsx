"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CompanyDetails, CompanyBankAccountItem } from "@/features/settings-branches/infrastructure/company.request";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import type { PointOfSaleListItem } from "@/features/sales-points-of-sale/types/point-of-sale.types";
import type { CashHubRow } from "@/features/treasury-cash-hubs/types/cash-hub.types";
import type { ShareholderRow } from "@/features/settings-shareholders/types/shareholder.types";
import { createCashHubAction } from "@/features/treasury-cash-hubs/actions/cash-hub.action";
import {
  postCapitalContributionAction,
  postCashDepositAction,
} from "@/features/treasury-bank-operations/actions/treasury-bank-operations.action";
import { Alert, Button, Dialog, IconButton, SelectDefault as Select, StatisticsCard, TextField, type Option } from "@kai/ui";
import TreasuryCashMovementsGrid from "./TreasuryCashMovementsGrid";
import type { TreasuryCashMovementGridRow } from "./treasury-cash-hub-movements-mapper";
import { UpdateCashHubDialog } from "./UpdateCashHubDialog";

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

function bankKey(a: CompanyBankAccountItem): string {
  const k = String(a.accountKey ?? "").trim();
  if (k) return k;
  // fallback (best-effort, but stable enough for UI selection)
  return `${a.bankName}-${a.accountNumber}`.replace(/\s+/g, "-").toLowerCase();
}

type Props = {
  company: CompanyDetails | null;
  hubs: CashHubRow[];
  selectedCashHubId: string | null;
  movementRows: TreasuryCashMovementGridRow[];
  movementsTotal: number;
  branches: BranchListItem[];
  pointsOfSale: PointOfSaleListItem[];
  totalCashHubs: number;
  totalOpenCashSessions: number;
  openCashSessionsCount: number;
  shareholders: ShareholderRow[];
};

type DialogKind = "none" | "createHub" | "editHub" | "depositToBank" | "capitalContribution";

const TREASURY_CARD_PAD = "[&_.fs-card__content]:p-2 [&_.fs-card__content]:pb-2";

export default function TreasuryCashTabContent({
  company,
  hubs,
  selectedCashHubId,
  movementRows,
  movementsTotal,
  branches,
  pointsOfSale,
  totalCashHubs,
  totalOpenCashSessions,
  openCashSessionsCount,
  shareholders,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dialog, setDialog] = useState<DialogKind>("none");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [capitalHubId, setCapitalHubId] = useState<string | null>(null);
  const [editingHub, setEditingHub] = useState<CashHubRow | null>(null);

  const selectedHub = useMemo(
    () => hubs.find((h) => String(h.id) === String(selectedCashHubId ?? "")) ?? null,
    [hubs, selectedCashHubId],
  );

  const capitalTargetHub = useMemo(() => {
    const id = capitalHubId ?? selectedCashHubId;
    if (!id) return null;
    return hubs.find((h) => String(h.id) === String(id)) ?? null;
  }, [capitalHubId, selectedCashHubId, hubs]);

  const totalCash = totalCashHubs + totalOpenCashSessions;

  const hubCards = hubs;

  const selectHub = useCallback(
    (id: string) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("cashHub", id);
      p.delete("page");
      router.push(`${pathname}?${p.toString()}`);
    },
    [pathname, router, searchParams],
  );

  // --- Create hub dialog state ---
  const [hubName, setHubName] = useState("");
  const [branchId, setBranchId] = useState<string | null>(null);
  const [posIds, setPosIds] = useState<string[]>([]);

  const branchOptions: Option[] = useMemo(
    () => branches.map((b) => ({ id: b.id, label: b.name })),
    [branches],
  );
  const posOptions: Option[] = useMemo(
    () =>
      pointsOfSale.map((p) => ({
        id: p.id,
        label: `${p.name}${p.branch?.name ? ` · ${p.branch.name}` : ""}`,
      })),
    [pointsOfSale],
  );

  // --- Deposit dialog state ---
  const accounts = company?.bankAccounts ?? [];
  const bankOptions: Option[] = useMemo(
    () =>
      accounts.map((a) => ({
        id: bankKey(a),
        label: `${a.bankName} · ${a.accountNumber}`,
      })),
    [accounts],
  );
  const [bankOpt, setBankOpt] = useState<string | null>(null);
  const [partnerOpt, setPartnerOpt] = useState<string | null>(null);
  const [amountStr, setAmountStr] = useState("0");
  const [notes, setNotes] = useState("");

  const partnerOptions: Option[] = useMemo(
    () =>
      shareholders.map((s) => ({
        id: s.id,
        label: partnerLabel(s),
      })),
    [shareholders],
  );

  const resetForms = () => {
    setError(null);
    setHubName("");
    setBranchId(null);
    setPosIds([]);
    setBankOpt(bankOptions[0] != null ? String(bankOptions[0].id) : null);
    setPartnerOpt(partnerOptions[0] != null ? String(partnerOptions[0].id) : null);
    setAmountStr("0");
    setNotes("");
  };

  useEffect(() => {
    if (dialog !== "none") {
      resetForms();
    }
  }, [dialog, bankOptions, partnerOptions]);

  const openDialog = (k: DialogKind) => {
    if (pending) return;
    setDialog(k);
  };

  const openEditHub = (hub: CashHubRow) => {
    if (pending) return;
    setEditingHub(hub);
    setDialog("editHub");
  };

  const closeDialog = () => {
    if (pending) return;
    setDialog("none");
    setCapitalHubId(null);
    setEditingHub(null);
  };

  const submitCreateHub = () => {
    setError(null);
    const companyId = company?.id?.trim() ?? "";
    if (!companyId) {
      setError("No hay empresa configurada.");
      return;
    }
    if (!hubName.trim()) {
      setError("Indique un nombre.");
      return;
    }
    if (posIds.length === 0) {
      setError("Seleccione al menos un punto de venta.");
      return;
    }
    startTransition(() => {
      void (async () => {
        const r = await createCashHubAction({
          companyId,
          name: hubName.trim(),
          branchIds: branchId ? [branchId] : [],
          pointOfSaleIds: posIds,
        });
        if (!r.success) {
          setError(r.error);
          return;
        }
        closeDialog();
        router.refresh();
      })();
    });
  };

  const amountNum = Math.max(0, Math.round(Number(amountStr) || 0));

  const submitCapitalContribution = () => {
    setError(null);
    if (!capitalTargetHub?.id) {
      setError("Seleccione un centro de efectivo.");
      return;
    }
    if (!partnerOpt || amountNum <= 0) {
      setError("Seleccione socio e indique un monto mayor a cero.");
      return;
    }
    startTransition(() => {
      void (async () => {
        const r = await postCapitalContributionAction({
          shareholderId: partnerOpt,
          cashHubId: capitalTargetHub.id,
          amount: amountNum,
          notes: notes.trim() || undefined,
        });
        if (!r.success) {
          setError(r.error);
          return;
        }
        closeDialog();
        router.refresh();
      })();
    });
  };

  const submitDeposit = () => {
    setError(null);
    if (!selectedHub?.id) {
      setError("Seleccione un centro de efectivo.");
      return;
    }
    if (!bankOpt || amountNum <= 0) {
      setError("Complete cuenta bancaria y monto.");
      return;
    }
    startTransition(() => {
      void (async () => {
        const r = await postCashDepositAction({
          bankAccountKey: bankOpt,
          amount: amountNum,
          notes: notes.trim() || undefined,
          cashHubId: selectedHub.id,
        });
        if (!r.success) {
          setError(r.error);
          return;
        }
        closeDialog();
        window.location.reload();
      })();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header Row */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(260px,420px)_minmax(0,1fr)] lg:items-start">
        <StatisticsCard
          label="Total en Efectivo"
          value={fmtMoney(totalCash)}
          hint={
            <span className="flex flex-col gap-1">
              <span>Centros de efectivo: {fmtMoney(totalCashHubs)}</span>
              <span>
                Sesiones de caja abiertas ({openCashSessionsCount}): {fmtMoney(totalOpenCashSessions)}
              </span>
            </span>
          }
          tone="info"
          className={TREASURY_CARD_PAD}
          data-test-id="treasury-cash-total-card"
        />

        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-2">
            <IconButton
              icon="Plus"
              variant="action"
              size="sm"
              ariaLabel="Crear centro de efectivo"
              onClick={() => openDialog("createHub")}
              disabled={pending}
              data-test-id="cash-hubs-create-open"
            />
            <h2 className="text-sm font-semibold text-foreground">Centros de Efectivo</h2>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {hubCards.map((h) => {
              const active = String(h.id) === String(selectedCashHubId ?? "");
              const balance = typeof h.currentBalance === "number" ? h.currentBalance : 0;
              return (
                <article
                  key={h.id}
                  role="button"
                  tabIndex={pending ? -1 : 0}
                  className={[
                    "fs-cash-hub-card rounded-xl p-3 text-left",
                    active ? "fs-cash-hub-card--selected" : "",
                    pending ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={pending ? undefined : () => selectHub(h.id)}
                  onKeyDown={(e) => {
                    if (pending) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectHub(h.id);
                    }
                  }}
                  data-test-id={`cash-hub-card-${h.id}`}
                  data-selected={active || undefined}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className="shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      role="presentation"
                    >
                      <IconButton
                        icon="Pencil"
                        variant="action"
                        size="sm"
                        ariaLabel="Editar centro de efectivo"
                        onClick={() => openEditHub(h)}
                        disabled={pending}
                        data-test-id={`cash-hub-edit-${h.id}`}
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                      {h.name}
                    </span>
                    <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                      {fmtMoney(balance)}
                    </span>
                    <div
                      className="flex shrink-0 items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      role="presentation"
                    >
                      <IconButton
                        icon="TrendingUp"
                        variant="action"
                        size="sm"
                        ariaLabel="Aporte de capital en efectivo desde un socio"
                        onClick={() => {
                          setCapitalHubId(h.id);
                          if (String(h.id) !== String(selectedCashHubId ?? "")) {
                            selectHub(h.id);
                          }
                          openDialog("capitalContribution");
                        }}
                        disabled={pending || partnerOptions.length === 0}
                        data-test-id={`cash-hub-capital-${h.id}`}
                      />
                      <IconButton
                        icon="Landmark"
                        variant="action"
                        size="sm"
                        ariaLabel="Depositar a banco desde este centro"
                        onClick={() => {
                          if (String(h.id) !== String(selectedCashHubId ?? "")) {
                            selectHub(h.id);
                          }
                          openDialog("depositToBank");
                        }}
                        disabled={pending}
                        data-test-id={`cash-hub-deposit-${h.id}`}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {/* Transaction History */}
      <TreasuryCashMovementsGrid
        rows={movementRows}
        total={movementsTotal}
        cashHubName={selectedHub?.name}
      />

      {/* Dialog: Create hub */}
      <Dialog
        open={dialog === "createHub"}
        onClose={closeDialog}
        title="Nuevo centro de efectivo"
        alertArea={error ? <Alert variant="error">{error}</Alert> : null}
        actionsJustify="end"
        actions={
          <>
            <Button variant="outlinedSecondary" onClick={closeDialog} disabled={pending} type="button">
              Cancelar
            </Button>
            <Button variant="primary" onClick={submitCreateHub} disabled={pending} type="button">
              {pending ? "Guardando…" : "Crear"}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-muted-foreground">
          Asigne al menos un punto de venta. La vinculación a sucursales es opcional.
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3">
            <TextField label="Nombre" value={hubName} onChange={(e) => setHubName(e.target.value)} />
            <Select
              label="Sucursales (opcional)"
              options={branchOptions}
              value={branchId}
              onChange={(v) => setBranchId(v != null ? String(v) : null)}
              allowClear
            />
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Puntos de venta (requerido, mínimo 1)
              </p>
              <div className="flex max-h-52 flex-col gap-1 overflow-y-auto rounded border border-border p-2">
                {posOptions.map((o) => {
                  const id = String(o.id);
                  const checked = posIds.includes(id);
                  return (
                    <label key={id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setPosIds((prev) => {
                            if (next) {
                              return prev.includes(id) ? prev : [...prev, id];
                            }
                            return prev.filter((x) => x !== id);
                          });
                        }}
                      />
                      <span className="min-w-0">{String(o.label)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Dialog>

      <UpdateCashHubDialog
        open={dialog === "editHub"}
        hub={editingHub}
        companyId={company?.id?.trim() ?? ""}
        branches={branches}
        pointsOfSale={pointsOfSale}
        onClose={closeDialog}
        onSaved={() => router.refresh()}
      />

      {/* Dialog: Capital contribution (cash hub) */}
      <Dialog
        open={dialog === "capitalContribution"}
        onClose={closeDialog}
        title="Aporte de capital en efectivo"
        alertArea={error ? <Alert variant="error">{error}</Alert> : null}
        actionsJustify="end"
        actions={
          <>
            <Button variant="outlinedSecondary" onClick={closeDialog} disabled={pending} type="button">
              Cancelar
            </Button>
            <Button variant="primary" onClick={submitCapitalContribution} disabled={pending} type="button">
              {pending ? "Registrando…" : "Registrar aporte"}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-muted-foreground">
          {capitalTargetHub
            ? `Ingreso de efectivo al centro «${capitalTargetHub.name}». Se contabiliza como aporte de capital del socio.`
            : "Seleccione un centro de efectivo."}
        </p>
        <div className="flex flex-col gap-3">
          <Select
            label="Socio"
            options={partnerOptions}
            value={partnerOpt}
            onChange={(v) => setPartnerOpt(v != null ? String(v) : null)}
            placeholder="Seleccione socio"
          />
          <TextField
            label="Monto"
            type="currency"
            currencySymbol="$"
            startSymbol="$"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            required
          />
          <TextField label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </Dialog>

      {/* Dialog: Deposit to bank */}
      <Dialog
        open={dialog === "depositToBank"}
        onClose={closeDialog}
        title="Depositar a banco"
        alertArea={error ? <Alert variant="error">{error}</Alert> : null}
        actionsJustify="end"
        actions={
          <>
            <Button variant="outlinedSecondary" onClick={closeDialog} disabled={pending} type="button">
              Cancelar
            </Button>
            <Button variant="primary" onClick={submitDeposit} disabled={pending} type="button">
              {pending ? "Registrando…" : "Depositar"}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-muted-foreground">
          {selectedHub ? `Centro: ${selectedHub.name}` : "Seleccione un centro"}
        </p>
        <div className="flex flex-col gap-3">
          <Select
            label="Cuenta bancaria"
            options={bankOptions}
            value={bankOpt}
            onChange={(v) => setBankOpt(v != null ? String(v) : null)}
          />
          <TextField
            label="Monto"
            type="currency"
            currencySymbol="$"
            startSymbol="$"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            required
          />
          <TextField label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </Dialog>
    </div>
  );
}

