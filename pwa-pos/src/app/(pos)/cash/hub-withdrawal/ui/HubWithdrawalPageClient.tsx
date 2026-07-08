"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  Alert,
  Button,
  DotProgress,
  Select,
  TextField,
} from "@/shared/admin-shared";
import type { Option } from "@/shared/components/Select/Select";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import { listCashHubsForDepositAction } from "@/features/session/actions/cash-hub-deposit.action";
import {
  getAvailableCashForSessionAction,
  withdrawCashSessionToHubAction,
} from "@/features/session/actions/cash-hub-withdrawal.action";
import type { CashHubDepositCandidate } from "@/features/session/types/cash-hub-deposit.types";
import { usePosOffline } from "@/features/pos-offline/hooks/use-pos-offline";
import { enqueueOfflineHubWithdrawal } from "@/features/pos-offline/application/enqueue-offline-cash.usecase";

const currencyFmt = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function parseAmountCl(raw: string): number {
  const s = raw.trim();
  if (!s) return NaN;
  const noThousands = s.replace(/\./g, "");
  const normalized = noThousands.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

export default function HubWithdrawalPageClient() {
  const [cashSessionId, setCashSessionId] = useState<string | null>(null);
  const [hubs, setHubs] = useState<CashHubDepositCandidate[]>([]);
  const [availableCash, setAvailableCash] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hubId, setHubId] = useState<string | null>(null);
  const [amountRaw, setAmountRaw] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { isOffline } = usePosOffline();

  useEffect(() => {
    const ctx = readPosContextClient();
    const id = typeof ctx?.cashSessionId === "string" ? ctx.cashSessionId.trim() : "";
    setCashSessionId(id || null);
  }, []);

  const loadData = useCallback(async (sessionId: string) => {
    setLoading(true);
    setLoadError(null);
    const [hRes, cRes] = await Promise.all([
      listCashHubsForDepositAction(sessionId),
      getAvailableCashForSessionAction(sessionId),
    ]);
    setLoading(false);
    if (!hRes.success) {
      setHubs([]);
      setAvailableCash(null);
      setLoadError(hRes.message);
      return;
    }
    if (!cRes.success) {
      setHubs([]);
      setAvailableCash(null);
      setLoadError(cRes.message);
      return;
    }
    setHubs(hRes.hubs);
    setAvailableCash(cRes.availableCash);
    if (hRes.hubs.length === 1) {
      setHubId(hRes.hubs[0].id);
    }
  }, []);

  useEffect(() => {
    if (cashSessionId === null) return;
    if (!cashSessionId) {
      setLoading(false);
      setLoadError("No hay sesión de caja activa. Abre caja desde la pantalla inicial del POS.");
      return;
    }
    void loadData(cashSessionId);
  }, [cashSessionId, loadData]);

  const selectedHub = useMemo(
    () => (hubId ? hubs.find((h) => h.id === hubId) ?? null : null),
    [hubId, hubs],
  );

  const hubOptions: Option[] = useMemo(
    () =>
      hubs.map((h) => ({
        id: h.id,
        label: `${h.name} · ${currencyFmt.format(h.currentBalance)}`,
      })),
    [hubs],
  );

  const amountNum = useMemo(() => parseAmountCl(amountRaw), [amountRaw]);

  const maxOut = availableCash ?? 0;

  const amountError = useMemo(() => {
    if (!amountRaw.trim()) return null;
    if (!Number.isFinite(amountNum) || amountNum < 1) return "Ingresa un monto válido (entero, mayor a cero).";
    if (amountNum > maxOut + 0.01) {
      return "El monto supera el efectivo disponible en la sesión.";
    }
    return null;
  }, [amountRaw, amountNum, maxOut]);

  const canSubmit =
    Boolean(
      cashSessionId &&
        hubId &&
        selectedHub &&
        Number.isFinite(amountNum) &&
        amountNum >= 1 &&
        !amountError &&
        maxOut >= 0.01,
    );

  const onSubmit = () => {
    setFormError(null);
    setSuccessMsg(null);
    if (!cashSessionId || !hubId || !selectedHub) {
      setFormError("Selecciona un centro de efectivo.");
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum < 1) {
      setFormError("Ingresa un monto válido.");
      return;
    }
    if (amountNum > maxOut + 0.01) {
      setFormError("El monto supera el efectivo disponible en la sesión.");
      return;
    }
    startTransition(async () => {
      if (isOffline) {
        try {
          const cmd = await enqueueOfflineHubWithdrawal({
            cashHubId: hubId,
            amount: amountNum,
            reason: reason.trim() || undefined,
          });
          setSuccessMsg(
            `Egreso encolado offline (${cmd.localDocumentNumber}). Se sincronizará al reconectar.`,
          );
          setAmountRaw("");
          setReason("");
        } catch (e) {
          setFormError(e instanceof Error ? e.message : "No se pudo encolar el egreso");
        }
        return;
      }
      const res = await withdrawCashSessionToHubAction({
        cashSessionId,
        cashHubId: hubId,
        amount: amountNum,
        reason: reason.trim() || undefined,
      });
      if (!res.success) {
        setFormError(res.message);
        return;
      }
      setSuccessMsg(
        `Traslado registrado: ${res.transaction.documentNumber} por ${currencyFmt.format(res.transaction.total)} al centro de efectivo.`,
      );
      setAmountRaw("");
      setReason("");
      void loadData(cashSessionId);
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--color-foreground)" }}>
          Egreso de efectivo a centro de efectivo
        </h1>
        <p className="mt-1 max-w-xl text-xs sm:text-sm" style={{ color: "var(--color-muted-foreground)" }}>
          Traslada efectivo desde la sesión de caja actual hacia el centro de efectivo elegido (aumenta el saldo del
          centro). El monto no puede superar el efectivo teórico disponible en sesión.
        </p>
      </div>

      {loadError ? (
        <Alert variant="warning" data-test-id="hub-withdrawal-load-error">
          {loadError}
        </Alert>
      ) : null}

      {successMsg ? (
        <Alert variant="success" data-test-id="hub-withdrawal-success">
          {successMsg}
        </Alert>
      ) : null}

      {formError ? (
        <Alert variant="error" data-test-id="hub-withdrawal-form-error">
          {formError}
        </Alert>
      ) : null}

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-12">
          <DotProgress />
        </div>
      ) : hubs.length === 0 && !loadError ? (
        <Alert variant="info" data-test-id="hub-withdrawal-no-hubs">
          No hay centros de efectivo configurados para este punto de venta.
        </Alert>
      ) : (
        <div className="flex flex-col gap-4">
          <div
            className="rounded-lg border px-4 py-3 text-sm"
            style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}
            data-test-id="hub-withdrawal-session-cash"
          >
            <span className="text-muted-foreground">Efectivo disponible en sesión</span>
            <div className="mt-1 text-lg font-semibold tabular-nums" style={{ color: "var(--color-foreground)" }}>
              {currencyFmt.format(maxOut)}
            </div>
          </div>

          <Select
            label="Centro de efectivo (destino)"
            placeholder="Centro de efectivo (destino)"
            options={hubOptions}
            value={hubId}
            onChange={(id) => setHubId(id != null ? String(id) : null)}
            required
            data-test-id="hub-withdrawal-select-hub"
          />

          {selectedHub ? (
            <div
              className="rounded-lg border px-4 py-3 text-sm"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}
              data-test-id="hub-withdrawal-hub-balance"
            >
              <span className="text-muted-foreground">
                Saldo actual del centro de efectivo (tras el movimiento aumentará)
              </span>
              <div className="mt-1 text-lg font-semibold tabular-nums" style={{ color: "var(--color-foreground)" }}>
                {currencyFmt.format(selectedHub.currentBalance)}
              </div>
            </div>
          ) : null}

          <TextField
            label="Monto a trasladar al centro de efectivo"
            placeholder="Monto a trasladar al centro de efectivo"
            value={amountRaw}
            onChange={(e) => setAmountRaw(e.target.value)}
            inputMode="numeric"
            data-test-id="hub-withdrawal-amount"
          />
          {amountError ? (
            <p className="text-xs text-red-600 dark:text-red-400" data-test-id="hub-withdrawal-amount-hint">
              {amountError}
            </p>
          ) : null}

          <TextField
            label="Motivo (opcional)"
            placeholder="Motivo (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            data-test-id="hub-withdrawal-reason"
          />

          <div className="flex justify-end pt-1">
            <Button
              variant="primary"
              disabled={!canSubmit || isPending}
              loading={isPending}
              onClick={onSubmit}
              data-test-id="hub-withdrawal-submit"
            >
              Confirmar egreso
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
