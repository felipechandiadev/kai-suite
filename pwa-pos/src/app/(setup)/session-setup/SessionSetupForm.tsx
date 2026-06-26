"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { PointOfSaleListItem, PosPriceList } from "@/features/session/types/point-of-sale.types";
import type { CashSessionListItem } from "@/features/session/types/cash-session.types";
import { openCashSessionAction } from "@/features/session/actions/session-setup.action";
import { listOpenCashSessionsAction } from "@/features/session/actions/cash-session.action";
import { listCashHubsForPosAction } from "@/features/session/actions/cash-hub-pos.action";
import type { CashHubDepositCandidate } from "@/features/session/types/cash-hub-deposit.types";
import { Alert, Button, Dialog, Select, TextField } from "@/shared/admin-shared";
import { fetchPointOfSalePriceListsAction } from "@/features/session/actions/point-of-sale-pos.action";
import { savePosContextClient, type PosPriceListSnapshot } from "@/features/session/lib/pos-context-storage";
import { queueCashSessionOpeningPrint } from "@/features/cash-session-opening/lib/pending-cash-session-opening-print";

export type MyOpenSession = {
  cashSessionId: string;
  pointOfSaleId: string;
  pointOfSaleName: string | null;
  branchName: string | null;
};

type Props = {
  pointsOfSale: PointOfSaleListItem[];
  initialError?: string;
  myOpenSession?: MyOpenSession | null;
};

type BranchOption = { id: string; name: string };

function savePosContext(input: {
  pointOfSaleId: string;
  storageId?: string | null;
  cashSessionId?: string | null;
  pointOfSaleName?: string | null;
  branchName?: string | null;
  priceListId?: string | null;
  branchId?: string | null;
  priceLists?: PosPriceListSnapshot[];
  posKind?: "PRESALE" | "SALE";
  acceptsPresaleTickets?: boolean;
}) {
  savePosContextClient({
    pointOfSaleId: input.pointOfSaleId,
    storageId: input.storageId ?? null,
    cashSessionId: input.cashSessionId ?? null,
    pointOfSaleName: input.pointOfSaleName ?? null,
    branchName: input.branchName ?? null,
    priceListId: input.priceListId ?? null,
    branchId: input.branchId ?? null,
    priceLists: input.priceLists ?? [],
  });
}

function getBranchId(p: PointOfSaleListItem): string | null {
  return p.branchId ?? p.branch?.id ?? null;
}

function getBranchName(p: PointOfSaleListItem): string | null {
  return p.branch?.name ?? null;
}

const currencyFmt = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function parseOpeningAmount(raw: string): number {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

function buildPosContextFromPos(pos: PointOfSaleListItem) {
  const availablePriceLists: PosPriceList[] = pos.priceLists ?? [];
  const defaultPriceListId =
    pos.defaultPriceListId && availablePriceLists.some((p) => p.id === pos.defaultPriceListId)
      ? pos.defaultPriceListId
      : availablePriceLists[0]?.id ?? "";
  return {
    pointOfSaleId: pos.id,
    storageId: pos.storageId ?? null,
    pointOfSaleName: pos.name,
    branchName: pos.branch?.name ?? null,
    branchId: pos.branchId ?? pos.branch?.id ?? null,
    priceListId: defaultPriceListId || null,
    priceLists: availablePriceLists.map((p) => ({ id: p.id, name: p.name })),
    posKind: pos.kind ?? "SALE",
    acceptsPresaleTickets: pos.acceptsPresaleTickets === true,
  };
}

export default function SessionSetupForm({
  pointsOfSale,
  initialError = "",
  myOpenSession = null,
}: Props) {
  if (myOpenSession) {
    return <MyOpenSessionPanel pointsOfSale={pointsOfSale} myOpenSession={myOpenSession} />;
  }
  return <NewSessionForm pointsOfSale={pointsOfSale} initialError={initialError} />;
}

// -----------------------------------------------------------------------------
// Panel: el usuario ya tiene una sesión de caja abierta.
// -----------------------------------------------------------------------------
function MyOpenSessionPanel({
  pointsOfSale,
  myOpenSession,
}: {
  pointsOfSale: PointOfSaleListItem[];
  myOpenSession: MyOpenSession;
}) {
  const router = useRouter();
  const myPos = pointsOfSale.find((p) => p.id === myOpenSession.pointOfSaleId) ?? null;

  const handleContinue = async () => {
    if (myPos) {
      savePosContext({
        ...buildPosContextFromPos(myPos),
        cashSessionId: myOpenSession.cashSessionId,
      });
    } else {
      const fetched = await fetchPointOfSalePriceListsAction(myOpenSession.pointOfSaleId);
      const priceLists =
        fetched.success && fetched.priceLists.length > 0 ? fetched.priceLists : [];
      const priceListId =
        (fetched.success &&
          fetched.defaultPriceListId &&
          priceLists.some((p) => p.id === fetched.defaultPriceListId) &&
          fetched.defaultPriceListId) ||
        priceLists[0]?.id ||
        null;
      savePosContext({
        pointOfSaleId: myOpenSession.pointOfSaleId,
        cashSessionId: myOpenSession.cashSessionId,
        pointOfSaleName: fetched.success ? fetched.pointOfSaleName : myOpenSession.pointOfSaleName,
        branchName:
          (fetched.success ? fetched.branchName : null) ?? myOpenSession.branchName,
        branchId: fetched.success ? fetched.branchId : null,
        storageId: fetched.success ? fetched.storageId : null,
        priceListId,
        priceLists,
        posKind: fetched.success ? fetched.posKind : "SALE",
        acceptsPresaleTickets: fetched.success ? fetched.acceptsPresaleTickets : false,
      });
    }
    router.push("/pos");
  };

  const handleClose = () => {
    router.push("/cash/closing");
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Sesión de caja</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Tienes una sesión de caja abierta. ¿Quieres continuarla o cerrarla?
      </p>

      <div className="mt-4 rounded-xl border border-border bg-neutral p-4">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Sesión abierta</h2>
        <dl className="mt-2 grid gap-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500 dark:text-zinc-400">Sucursal</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-100">
              {myOpenSession.branchName ?? myPos?.branch?.name ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500 dark:text-zinc-400">Punto de venta</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-100">
              {myOpenSession.pointOfSaleName ?? myPos?.name ?? "—"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button type="button" variant="outlined" onClick={handleClose}>
          Cerrar sesión de caja
        </Button>
        <Button type="button" onClick={handleContinue}>
          Continuar sesión de caja
        </Button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Form: el usuario NO tiene sesión propia abierta. Permite seleccionar
// sucursal + punto de venta y abrir una nueva sesión.
// -----------------------------------------------------------------------------
function NewSessionForm({
  pointsOfSale,
  initialError,
}: {
  pointsOfSale: PointOfSaleListItem[];
  initialError: string;
}) {
  const router = useRouter();
  const { data: authSession } = useSession();
  const [isPending, startTransition] = useTransition();

  const branches: BranchOption[] = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pointsOfSale) {
      const id = getBranchId(p);
      const name = getBranchName(p);
      if (id && !map.has(id)) {
        map.set(id, name ?? id);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [pointsOfSale]);

  const [branchId, setBranchId] = useState<string>(branches[0]?.id ?? "");
  const [pointOfSaleId, setPointOfSaleId] = useState<string>("");

  const pointsOfSaleForBranch = useMemo(
    () => pointsOfSale.filter((p) => getBranchId(p) === branchId),
    [pointsOfSale, branchId],
  );

  const selectedPos = useMemo(
    () => pointsOfSaleForBranch.find((p) => p.id === pointOfSaleId) ?? null,
    [pointsOfSaleForBranch, pointOfSaleId],
  );

  const availablePriceLists: PosPriceList[] = selectedPos?.priceLists ?? [];
  const defaultPriceListId =
    selectedPos?.defaultPriceListId && availablePriceLists.some((p) => p.id === selectedPos.defaultPriceListId)
      ? selectedPos.defaultPriceListId
      : availablePriceLists[0]?.id ?? "";
  const defaultPriceListName =
    availablePriceLists.find((p) => p.id === defaultPriceListId)?.name ?? null;

  const [openSessions, setOpenSessions] = useState<CashSessionListItem[]>([]);
  const [loadingOpenSessions, setLoadingOpenSessions] = useState<boolean>(false);

  const refreshOpenSessions = async () => {
    setLoadingOpenSessions(true);
    try {
      const res = await listOpenCashSessionsAction();
      if (res.success) {
        setOpenSessions(res.items);
      }
    } finally {
      setLoadingOpenSessions(false);
    }
  };

  useEffect(() => {
    refreshOpenSessions();
  }, []);

  const openSessionForSelectedPos = useMemo(
    () => (pointOfSaleId ? openSessions.find((s) => s.pointOfSaleId === pointOfSaleId) ?? null : null),
    [openSessions, pointOfSaleId],
  );
  const hasOpenSessionForPos = openSessionForSelectedPos !== null;

  const handleBranchChange = (nextId: string) => {
    setBranchId(nextId);
    setPointOfSaleId("");
  };

  const [isOpenAmountDialog, setIsOpenAmountDialog] = useState(false);
  const [openingAmount, setOpeningAmount] = useState<string>("0");
  const [cashHubId, setCashHubId] = useState<string | null>(null);
  const [cashHubs, setCashHubs] = useState<CashHubDepositCandidate[]>([]);
  const [loadingCashHubs, setLoadingCashHubs] = useState(false);
  const [error, setError] = useState<string>(initialError);

  const openingAmountNum = parseOpeningAmount(openingAmount);
  const requiresCashHub = openingAmountNum > 0;

  const selectedCashHub = useMemo(
    () => (cashHubId ? cashHubs.find((h) => h.id === cashHubId) ?? null : null),
    [cashHubs, cashHubId],
  );

  const hubBalanceInsufficient =
    requiresCashHub &&
    selectedCashHub != null &&
    openingAmountNum > selectedCashHub.currentBalance + 0.01;

  const canSubmitOpening =
    !isPending &&
    !loadingCashHubs &&
    pointOfSaleId.trim() !== "" &&
    openingAmount.trim() !== "" &&
    openingAmountNum >= 0 &&
    (!requiresCashHub || Boolean(cashHubId)) &&
    !hubBalanceInsufficient;

  const loadCashHubsForPos = async (posId: string) => {
    setLoadingCashHubs(true);
    setCashHubs([]);
    setCashHubId(null);
    try {
      const res = await listCashHubsForPosAction(posId);
      if (res.success) {
        setCashHubs(res.hubs);
        if (res.hubs.length === 1) {
          setCashHubId(res.hubs[0].id);
        }
      } else {
        setError(res.message);
      }
    } finally {
      setLoadingCashHubs(false);
    }
  };

  useEffect(() => {
    if (!isOpenAmountDialog || !pointOfSaleId) return;
    void loadCashHubsForPos(pointOfSaleId);
  }, [isOpenAmountDialog, pointOfSaleId]);

  const handleConfirmOpen = () => {
    setError("");
    if (!canSubmitOpening) return;

    startTransition(async () => {
      const result = await openCashSessionAction({
        pointOfSaleId,
        openingAmount: openingAmountNum,
        cashHubId: requiresCashHub ? cashHubId ?? undefined : undefined,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (selectedPos) {
        savePosContext({
          ...buildPosContextFromPos(selectedPos),
          cashSessionId: result.cashSessionId,
        });
      }

      queueCashSessionOpeningPrint({
        cashSessionId: result.cashSessionId,
        openedAt: new Date().toISOString(),
        openingAmount: openingAmountNum,
        branchName: selectedPos?.branch?.name ?? selectedPos?.branchName ?? null,
        pointOfSaleName: selectedPos?.name ?? null,
        operatorName:
          authSession?.user?.name?.trim() || authSession?.user?.email?.trim() || null,
        cashHubName: selectedCashHub?.name ?? null,
      });

      setIsOpenAmountDialog(false);
      router.push("/pos");
    });
  };

  const isPresalePos = (selectedPos?.kind ?? "SALE") === "PRESALE";

  const handleEnterPresale = () => {
    if (!selectedPos) return;
    savePosContext({
      ...buildPosContextFromPos(selectedPos),
      cashSessionId: null,
    });
    router.push("/pos");
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">
        {isPresalePos ? "Punto de preventa" : "Sesión de caja"}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {isPresalePos
          ? "Selecciona la sucursal y el punto de preventa para armar carritos y generar tickets."
          : "Selecciona la sucursal y el punto de venta para abrir una sesión de caja."}
      </p>

      <div className="mt-6 grid gap-4">
        <div className="grid gap-2">
          <Select
            label="Sucursal"
            placeholder="Sucursal"
            value={branchId || null}
            onChange={(id) => handleBranchChange(id ? String(id) : "")}
            options={branches.map((b) => ({ id: b.id, label: b.name }))}
            required
            disabled={branches.length === 0}
          />
          {branches.length === 0 ? (
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              No hay sucursales con puntos de venta asignados a este usuario.
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Select
            label="Punto de venta"
            placeholder="Punto de venta"
            value={pointOfSaleId || null}
            onChange={(id) => setPointOfSaleId(id ? String(id) : "")}
            options={pointsOfSaleForBranch.map((p) => ({ id: p.id, label: p.name }))}
            required
            disabled={!branchId || pointsOfSaleForBranch.length === 0}
          />
          {branchId && pointsOfSaleForBranch.length === 0 ? (
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              No hay puntos de venta para esta sucursal.
            </p>
          ) : null}
        </div>

        {selectedPos ? (
          <div className="mt-2 rounded-xl border border-border bg-neutral p-4">
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Resumen</h2>
            <dl className="mt-2 grid gap-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Sucursal</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                  {selectedPos.branch?.name ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Punto de venta</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">{selectedPos.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Lista de precios</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                  {defaultPriceListName ?? "Sin lista de precios asignada"}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}

        {error && !isOpenAmountDialog ? <Alert variant="error">{error}</Alert> : null}

        {selectedPos ? (
          isPresalePos ? (
            <Button type="button" onClick={handleEnterPresale} disabled={!defaultPriceListId}>
              Entrar a preventa
            </Button>
          ) : hasOpenSessionForPos ? (
            <Alert variant="info">
              Ya existe una sesión de caja abierta para este punto de venta
              {openSessionForSelectedPos?.openedByFullName
                ? ` (abierta por ${openSessionForSelectedPos.openedByFullName})`
                : ""}
              .
            </Alert>
          ) : (
            <Button
              type="button"
              onClick={() => {
                setError("");
                setOpeningAmount("0");
                setCashHubId(null);
                setCashHubs([]);
                setIsOpenAmountDialog(true);
              }}
              disabled={loadingOpenSessions}
            >
              Abrir nueva sesión de caja
            </Button>
          )
        ) : null}
      </div>

      <Dialog
        open={isOpenAmountDialog}
        onClose={() => {
          if (!isPending) setIsOpenAmountDialog(false);
        }}
        title="Abrir sesión de caja"
        size="sm"
        actionsJustify="between"
        actions={
          <>
            <Button
              type="button"
              variant="outlined"
              onClick={() => setIsOpenAmountDialog(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmOpen}
              disabled={!canSubmitOpening}
              loading={isPending}
            >
              Abrir sesión de caja
            </Button>
          </>
        }
        alertArea={error && isOpenAmountDialog ? <Alert variant="error">{error}</Alert> : null}
      >
        <div className="grid gap-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Indica el centro de efectivo fuente y el monto de apertura para la sesión de caja del punto de
            venta{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{selectedPos?.name}</span>.
            El movimiento quedará registrado en el centro de efectivo como apertura de caja.
          </p>
          {loadingCashHubs ? (
            <p className="text-sm text-muted-foreground">Cargando centros de efectivo…</p>
          ) : cashHubs.length === 0 && requiresCashHub ? (
            <Alert variant="warning">
              No hay centros de efectivo vinculados a este punto de venta. Configúralos en administración
              antes de abrir caja con efectivo.
            </Alert>
          ) : cashHubs.length > 0 ? (
            <Select
              label="Centro de efectivo (fuente)"
              placeholder="Seleccione centro de efectivo"
              value={cashHubId}
              onChange={(id) => setCashHubId(id != null ? String(id) : null)}
              options={cashHubs.map((h) => ({
                id: h.id,
                label: `${h.name}${h.code ? ` · ${h.code}` : ""} · ${currencyFmt.format(h.currentBalance)}`,
              }))}
              required={requiresCashHub}
              disabled={isPending}
            />
          ) : null}
          {selectedCashHub ? (
            <p className="text-xs text-muted-foreground">
              Saldo disponible en el centro:{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {currencyFmt.format(selectedCashHub.currentBalance)}
              </span>
            </p>
          ) : null}
          {hubBalanceInsufficient ? (
            <Alert variant="error">
              El centro de efectivo no tiene saldo suficiente para el monto de apertura ingresado (
              {currencyFmt.format(openingAmountNum)}). Disponible:{" "}
              {currencyFmt.format(selectedCashHub?.currentBalance ?? 0)}.
            </Alert>
          ) : null}
          <TextField
            label="Monto de apertura"
            type="currency"
            placeholder="Monto de apertura"
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value)}
            required
            disabled={isPending}
            className="w-full"
          />
        </div>
      </Dialog>
    </div>
  );
}
