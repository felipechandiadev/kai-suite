"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Alert, Button, DotProgress, Select, TextField } from "@kai/ui";
import type { Option } from "@kai/ui";
import { readPosContextClient, patchPosContextClient } from "@/features/session/lib/pos-context-storage";
import { listOpenCashSessionsAction } from "@/features/session/actions/cash-session.action";
import { listCashHubsForDepositAction } from "@/features/session/actions/cash-hub-deposit.action";
import { closeCashSessionAction } from "@/features/session/actions/close-cash-session.action";
import { getEffectivePosPaymentMethodsAction } from "@/features/pos-payment-methods/actions/payment-methods-pos.action";
import type { EffectivePaymentMethod } from "@/features/pos-payment-methods/types/effective-payment-method.types";
import type { CashHubDepositCandidate } from "@/features/session/types/cash-hub-deposit.types";
import type { PosPaymentMethodId } from "@/features/pos-cart/pos-payment.types";
import {
  addAmountToCloseCounted,
  emptyCloseCounted,
  grandCloseCounted,
} from "@/features/session/lib/close-counted-buckets";
import { usePosCart } from "@/features/pos-cart/PosCartProvider";
import { saveCashClosingResultSnapshot } from "@/features/cash-closing/lib/cash-closing-result-storage";
import { getCompanyDetailsAction } from "@/features/company/actions/company.action";
import type { CompanyDetails } from "@/features/company/infrastructure/company.request";
import {
  describePosDocumentPrintMode,
  getPosDocumentPrintMode,
} from "@kai/print-service-client";
import type { CashCountSheetPrintInput } from "@/features/cash-closing/lib/cash-count-sheet-print.types";
import { printCashCountSheetAwait } from "@/features/cash-closing/lib/cash-count-sheet-print";
import { usePosOffline } from "@/features/pos-offline/hooks/use-pos-offline";
import {
  enqueueOfflineCloseSession,
} from "@/features/pos-offline/application/enqueue-offline-cash.usecase";
import { hasBlockingCommandsForClose } from "@/features/pos-offline/application/enqueue-command.usecase";

/** Si el POS no devuelve catálogo, permitimos arqueo con los medios estándar. */
function fallbackCloseMethods(): EffectivePaymentMethod[] {
  const rows: Array<{ method: PosPaymentMethodId; label: string; order: number }> = [
    { method: "CASH", label: "Efectivo", order: 0 },
    { method: "DEBIT_CARD", label: "Tarjeta débito", order: 1 },
    { method: "CREDIT_CARD", label: "Tarjeta crédito", order: 2 },
    { method: "TRANSFER", label: "Transferencia", order: 3 },
    { method: "CHECK", label: "Cheque", order: 4 },
  ];
  return rows.map((r) => ({
    companyPaymentMethodId: `__close_fallback__:${r.method}`,
    method: r.method,
    label: r.label,
    alias: null,
    bankAccountKey: null,
    requireReference: false,
    preloadOnPaymentScreen: false,
    preloadOrder: null,
    isDefaultForChange: r.method === "CASH",
    displayOrder: r.order,
  }));
}

const currencyFmt = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

/** Monto en pesos CLP (enteros) desde `TextField` tipo currency (sólo dígitos). */
function parseAmountCLPInput(raw: string): number {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

type CloseOk = Extract<Awaited<ReturnType<typeof closeCashSessionAction>>, { success: true }>;

function CashClosingPageHeader({ title }: { title: string }) {
  return (
    <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
  );
}

export default function CashClosingPageClient() {
  const router = useRouter();
  const { data: authSession, status: authStatus } = useSession();
  const cart = usePosCart();

  const [cashSessionId, setCashSessionId] = useState<string | null>(null);
  const [sessionOpenedAt, setSessionOpenedAt] = useState<string | null>(null);
  const [pointOfSaleId, setPointOfSaleId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingCtx, setLoadingCtx] = useState(true);

  const [effectiveMethods, setEffectiveMethods] = useState<EffectivePaymentMethod[]>([]);
  const [effectiveError, setEffectiveError] = useState<string | null>(null);
  const [effectiveLoaded, setEffectiveLoaded] = useState(false);

  const [hubs, setHubs] = useState<CashHubDepositCandidate[]>([]);
  const [loadingHubs, setLoadingHubs] = useState(false);
  const [hubsError, setHubsError] = useState<string | null>(null);
  const [hubId, setHubId] = useState<string | null>(null);

  const [amountsByMethodId, setAmountsByMethodId] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [countSheetPrintStatus, setCountSheetPrintStatus] = useState<string | null>(null);
  const [countSheetPrintBusy, setCountSheetPrintBusy] = useState(false);

  const [isPending, startTransition] = useTransition();
  const { isOffline } = usePosOffline();

  useEffect(() => {
    const ctx = readPosContextClient();
    const sid = typeof ctx?.cashSessionId === "string" ? ctx.cashSessionId.trim() : "";
    const pid = typeof ctx?.pointOfSaleId === "string" ? ctx.pointOfSaleId.trim() : "";
    setCashSessionId(sid || null);
    setPointOfSaleId(pid || null);
    setLoadingCtx(false);
    if (!sid) {
      setLoadError("No hay sesión de caja activa. Abre caja desde la pantalla inicial del POS.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setEffectiveLoaded(false);
      if (!pointOfSaleId) {
        if (!cancelled) {
          setEffectiveMethods([]);
          setEffectiveError(loadingCtx ? null : "Sin punto de venta en el contexto.");
        }
        if (!cancelled) setEffectiveLoaded(true);
        return;
      }
      const res = await getEffectivePosPaymentMethodsAction({ pointOfSaleId });
      if (cancelled) return;
      if (res.success) {
        setEffectiveMethods(res.paymentMethods);
        setEffectiveError(null);
      } else {
        setEffectiveMethods([]);
        setEffectiveError(res.message);
      }
      setEffectiveLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [pointOfSaleId, loadingCtx]);

  const inputMethods = useMemo(() => {
    if (effectiveMethods.length > 0) return effectiveMethods;
    if (effectiveLoaded && pointOfSaleId && !effectiveError) return fallbackCloseMethods();
    return [];
  }, [effectiveLoaded, effectiveError, effectiveMethods, pointOfSaleId]);

  useEffect(() => {
    setAmountsByMethodId((prev) => {
      const next = { ...prev };
      for (const m of inputMethods) {
        const id = m.companyPaymentMethodId;
        if (!(id in next)) next[id] = "";
      }
      return next;
    });
  }, [inputMethods]);

  const loadHubs = useCallback(async (sessionId: string) => {
    setLoadingHubs(true);
    setHubsError(null);
    const res = await listCashHubsForDepositAction(sessionId);
    setLoadingHubs(false);
    if (!res.success) {
      setHubs([]);
      setHubId(null);
      setHubsError(res.message);
      return;
    }
    setHubs(res.hubs);
    if (res.hubs.length === 1) {
      setHubId(res.hubs[0].id);
    } else {
      setHubId((prev) => (prev && res.hubs.some((h) => h.id === prev) ? prev : null));
    }
  }, []);

  useEffect(() => {
    if (!cashSessionId) return;
    void loadHubs(cashSessionId);
  }, [cashSessionId, loadHubs]);

  useEffect(() => {
    if (!cashSessionId) {
      setSessionOpenedAt(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await listOpenCashSessionsAction();
      if (cancelled || !res.success) return;
      const row = res.items.find((s) => s.id === cashSessionId);
      const iso = row?.openedAt ?? row?.createdAt ?? null;
      if (!cancelled) setSessionOpenedAt(iso);
    })();
    return () => {
      cancelled = true;
    };
  }, [cashSessionId]);

  const hubOptions: Option[] = useMemo(
    () =>
      hubs.map((h) => ({
        id: h.id,
        label: h.name,
      })),
    [hubs],
  );

  const countedPayload = useMemo(() => {
    const acc = emptyCloseCounted();
    for (const m of inputMethods) {
      const raw = amountsByMethodId[m.companyPaymentMethodId] ?? "";
      addAmountToCloseCounted(acc, String(m.method), parseAmountCLPInput(raw));
    }
    return acc;
  }, [amountsByMethodId, inputMethods]);

  const countedGrand = useMemo(() => grandCloseCounted(countedPayload), [countedPayload]);

  const userId = authSession?.user?.id?.trim() ?? "";
  const operatorName =
    authSession?.user?.name?.trim() ||
    authSession?.user?.email?.trim() ||
    "";

  const posCtx = useMemo(() => readPosContextClient(), []);

  const hubSelected = Boolean(hubId?.trim());
  const hubReady = !loadingHubs && hubs.length > 0 && hubSelected;

  const canSubmitBlind = Boolean(
    cashSessionId &&
      userId &&
      authStatus === "authenticated" &&
      !isPending &&
      !loadingHubs &&
      inputMethods.length > 0 &&
      hubReady,
  );

  const onPrintCountSheet = useCallback(async () => {
    if (!cashSessionId) {
      setCountSheetPrintStatus("No hay sesión de caja activa.");
      return;
    }
    if (inputMethods.length === 0) {
      setCountSheetPrintStatus("No hay medios de pago para listar en la planilla.");
      return;
    }
    setCountSheetPrintBusy(true);
    setCountSheetPrintStatus(null);
    try {
      let company: CompanyDetails | null = null;
      try {
        company = (await getCompanyDetailsAction()) ?? null;
      } catch {
        company = null;
      }
      const input: CashCountSheetPrintInput = {
        cashSessionId,
        sessionOpenedAt,
        company,
        branchName: posCtx?.branchName ?? null,
        pointOfSaleName: posCtx?.pointOfSaleName ?? null,
        operatorName: operatorName || null,
        paymentLines: inputMethods.map((m) => ({
          label: m.label?.trim() || String(m.method),
        })),
      };
      const formatLabel = describePosDocumentPrintMode(getPosDocumentPrintMode("cashCountSheet"));
      const channel = await printCashCountSheetAwait(input);
      setCountSheetPrintStatus(
        channel === "agent"
          ? `Planilla de conteo enviada a KaiPrinters. Formato: ${formatLabel}.`
          : `Planilla de conteo abierta en el diálogo de impresión del navegador. Formato: ${formatLabel}.`,
      );
    } catch (e) {
      setCountSheetPrintStatus(
        e instanceof Error ? e.message : "No se pudo imprimir la planilla de conteo.",
      );
    } finally {
      setCountSheetPrintBusy(false);
    }
  }, [
    cashSessionId,
    inputMethods,
    operatorName,
    posCtx?.branchName,
    posCtx?.pointOfSaleName,
    sessionOpenedAt,
  ]);

  const onSubmitBlind = () => {
    setFormError(null);
    if (!cashSessionId) {
      setFormError("No hay sesión de caja activa.");
      return;
    }
    if (!userId) {
      setFormError("No se pudo determinar el usuario de la sesión. Vuelve a iniciar sesión.");
      return;
    }
    if (countedGrand < 1) {
      setFormError(
        "Ingresa los montos contados por cada medio habilitado. La suma debe ser mayor a cero para realizar el arqueo ciego; si necesitas cerrar sin conteo, contacta soporte o usa el flujo estándar desde administración.",
      );
      return;
    }
    if (loadingHubs) {
      setFormError("Espera a que carguen los centros de efectivo.");
      return;
    }
    if (hubs.length === 0 && !isOffline) {
      setFormError(
        hubsError ??
          "No hay centros de efectivo habilitados para este POS. Configúralos en administración antes de cerrar la caja.",
      );
      return;
    }
    const selectedHubId = hubId?.trim() ?? "";
    if (!selectedHubId && !isOffline) {
      setFormError("Selecciona el centro de efectivo donde se depositará el efectivo contado.");
      return;
    }

    startTransition(async () => {
      if (isOffline) {
        const blocking = await hasBlockingCommandsForClose();
        if (blocking) {
          setFormError(
            "Hay operaciones pendientes en la cola offline. Sincroniza o resuelve conflictos antes de cerrar.",
          );
          return;
        }
        try {
          const cmd = await enqueueOfflineCloseSession({
            cashHubId: selectedHubId || undefined,
            notes: notes.trim() || undefined,
            counted: countedPayload,
          });
          patchPosContextClient({ cashSessionId: null });
          cart.clear();
          setFormError(null);
          router.push(
            `/cash/closing/result?offline=1&localDoc=${encodeURIComponent(cmd.localDocumentNumber)}`,
          );
        } catch (e) {
          setFormError(e instanceof Error ? e.message : "No se pudo encolar el cierre");
        }
        return;
      }
      const res = await closeCashSessionAction({
        cashSessionId,
        userId,
        notes: notes.trim() || undefined,
        cashHubId: selectedHubId,
        counted: countedPayload,
      });
      if (!res.success) {
        setFormError(res.message);
        return;
      }
      patchPosContextClient({ cashSessionId: null });
      cart.clear();

      saveCashClosingResultSnapshot({
        closeResult: res,
        sessionOpenedAt,
        notes: notes.trim(),
        countedGrand,
        pointOfSaleName: posCtx?.pointOfSaleName ?? null,
        branchName: posCtx?.branchName ?? null,
        operatorName: operatorName || null,
        closedAt: new Date().toISOString(),
      });

      router.replace("/cash/closing/result");
    });
  };

  if (loadingCtx) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <DotProgress />
        Cargando contexto…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
      <CashClosingPageHeader title="Cierre de caja (arqueo ciego)" />

      {loadError ? (
        <Alert variant="warning" className="text-sm">
          {loadError}
        </Alert>
      ) : null}

      {effectiveError ? (
        <Alert variant="warning" className="text-sm">
          No se pudieron cargar los medios de pago del POS: {effectiveError}
        </Alert>
      ) : null}

      {formError ? (
        <Alert variant="error" className="text-sm">
          {formError}
        </Alert>
      ) : null}

      {countSheetPrintStatus ? (
        <Alert variant="info" className="text-sm">
          {countSheetPrintStatus}{" "}
          <span className="text-muted-foreground">
            Para cambiar el formato:{" "}
            <span className="font-medium text-foreground">
              Ajustes → Impresión local → Planilla de conteo
            </span>
            .
          </span>
        </Alert>
      ) : null}

      <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Conteo por medio</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Puedes imprimir una planilla en blanco para anotar los montos antes de cargarlos aquí.
            </p>
          </div>
          <Button
            type="button"
            variant="outlined"
            size="sm"
            disabled={!cashSessionId || inputMethods.length === 0 || countSheetPrintBusy || !effectiveLoaded}
            loading={countSheetPrintBusy}
            onClick={() => void onPrintCountSheet()}
            data-test-id="cash-closing-print-count-sheet"
          >
            Imprimir planilla
          </Button>
        </div>

        {!effectiveLoaded ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <DotProgress /> Cargando medios de pago…
          </div>
        ) : inputMethods.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {loadError
              ? "Sin medios de pago para mostrar."
              : "No hay medios configurados. Revisa el punto de venta o vuelve a abrir sesión."}
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {inputMethods.map((m) => {
              const id = m.companyPaymentMethodId;
              const val = amountsByMethodId[id] ?? "";
              return (
                <li key={id}>
                  <TextField
                    type="currency"
                    label={m.label}
                    name={`close-count-${id}`}
                    value={val}
                    onChange={(e) =>
                      setAmountsByMethodId((prev) => ({
                        ...prev,
                        [id]: e.target.value,
                      }))
                    }
                    alwaysShowLabel
                  />
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Suma ingresada:{" "}
            <span className="font-semibold tabular-nums text-foreground">{currencyFmt.format(countedGrand)}</span>
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Centro de efectivo</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          El efectivo contado se traslada al centro que elijas al cerrar la caja.
        </p>
        <div className="mt-4">
          {loadingHubs ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
              <DotProgress /> Cargando centros…
            </div>
          ) : hubs.length === 0 ? (
            <Alert variant="warning" className="text-xs">
              {hubsError ??
                "No hay centros de efectivo habilitados para este POS. Configúralos en administración antes de cerrar la caja."}
            </Alert>
          ) : (
            <Select
              label="Centro de efectivo"
              placeholder="Selecciona…"
              options={hubOptions}
              value={hubId}
              required
              onChange={(id) => setHubId(id != null ? String(id) : null)}
            />
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
        <TextField
          label="Notas (opcional)"
          name="close-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          alwaysShowLabel
        />
      </section>

      <div className="flex justify-end pt-1">
        <Button type="button" variant="primary" disabled={!canSubmitBlind} onClick={onSubmitBlind}>
          {isPending ? "Procesando…" : "Cerrar sesión y cuadrar"}
        </Button>
      </div>
    </div>
  );
}
