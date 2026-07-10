"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import {
  Alert,
  Button,
  DotProgress,
  Select,
  TextField,
} from "@/shared/admin-shared";
import type { Option } from "@/shared/components/Select/Select";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import {
  depositCashFromHubAction,
  listCashHubsForDepositAction,
} from "@/features/session/actions/cash-hub-deposit.action";
import type { CashHubDepositCandidate } from "@/features/session/types/cash-hub-deposit.types";
import { usePosOffline } from "@/features/pos-offline/hooks/use-pos-offline";
import { enqueueOfflineHubDeposit } from "@/features/pos-offline/application/enqueue-offline-cash.usecase";
import { printCashHubMovementReceipt } from "@/features/cash-hub-movement/lib/print-cash-hub-movement-receipt";

const currencyFmt = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function parseAmountCl(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return NaN;
  const n = Number(digits);
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

export default function HubDepositPageClient() {
  const [cashSessionId, setCashSessionId] = useState<string | null>(null);
  const [hubs, setHubs] = useState<CashHubDepositCandidate[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingHubs, setLoadingHubs] = useState(true);
  const [hubId, setHubId] = useState<string | null>(null);
  const [amountRaw, setAmountRaw] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { isOffline } = usePosOffline();
  const { data: authSession } = useSession();
  const operatorName =
    (authSession?.user as { userName?: string; name?: string } | undefined)?.userName?.trim() ||
    authSession?.user?.name?.trim() ||
    null;

  useEffect(() => {
    const ctx = readPosContextClient();
    const id = typeof ctx?.cashSessionId === "string" ? ctx.cashSessionId.trim() : "";
    setCashSessionId(id || null);
  }, []);

  const loadHubs = useCallback(async (sessionId: string) => {
    setLoadingHubs(true);
    setLoadError(null);
    const res = await listCashHubsForDepositAction(sessionId);
    setLoadingHubs(false);
    if (!res.success) {
      setHubs([]);
      setLoadError(res.message);
      return;
    }
    setHubs(res.hubs);
    if (res.hubs.length === 1) {
      setHubId(res.hubs[0].id);
    }
  }, []);

  useEffect(() => {
    if (cashSessionId === null) return;
    if (!cashSessionId) {
      setLoadingHubs(false);
      setLoadError("No hay sesión de caja activa. Abre caja desde la pantalla inicial del POS.");
      return;
    }
    void loadHubs(cashSessionId);
  }, [cashSessionId, loadHubs]);

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

  const amountError = useMemo(() => {
    if (!amountRaw.trim()) return null;
    if (!Number.isFinite(amountNum) || amountNum < 1) return "Ingresa un monto válido (entero, mayor a cero).";
    if (selectedHub && amountNum > selectedHub.currentBalance + 0.01) {
      return "El monto supera el disponible en el centro de efectivo.";
    }
    return null;
  }, [amountRaw, amountNum, selectedHub]);

  const canSubmit =
    Boolean(cashSessionId && hubId && selectedHub && Number.isFinite(amountNum) && amountNum >= 1 && !amountError);

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
    if (amountNum > selectedHub.currentBalance + 0.01) {
      setFormError("El monto supera el disponible en el centro de efectivo.");
      return;
    }
    startTransition(async () => {
      if (isOffline) {
        try {
          const cmd = await enqueueOfflineHubDeposit({
            cashHubId: hubId,
            amount: amountNum,
            reason: reason.trim() || undefined,
          });
          setSuccessMsg(
            `Ingreso encolado offline (${cmd.localDocumentNumber}). Se sincronizará al reconectar.`,
          );
          printCashHubMovementReceipt({
            direction: "IN",
            documentNumber: cmd.localDocumentNumber,
            amount: amountNum,
            cashHubName: selectedHub.name,
            reason: reason.trim() || undefined,
            operatorName,
          });
          setAmountRaw("");
          setReason("");
        } catch (e) {
          setFormError(e instanceof Error ? e.message : "No se pudo encolar el ingreso");
        }
        return;
      }
      const res = await depositCashFromHubAction({
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
        `Ingreso registrado: ${res.transaction.documentNumber} por ${currencyFmt.format(res.transaction.total)}.`,
      );
      printCashHubMovementReceipt({
        direction: "IN",
        documentNumber: res.transaction.documentNumber,
        amount: res.transaction.total,
        cashHubName: selectedHub.name,
        reason: reason.trim() || undefined,
        operatorName,
      });
      setAmountRaw("");
      setReason("");
      void loadHubs(cashSessionId);
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--color-foreground)" }}>
          Ingreso de efectivo desde centro de efectivo
        </h1>
        <p className="mt-1 max-w-xl text-xs sm:text-sm" style={{ color: "var(--color-muted-foreground)" }}>
          Elige el centro de efectivo vinculado a este punto de venta, confirma el saldo disponible e ingresa el monto a
          sumar en la caja de la sesión actual.
        </p>
      </div>

      {loadError ? (
        <Alert variant="warning" data-test-id="hub-deposit-load-error">
          {loadError}
        </Alert>
      ) : null}

      {successMsg ? (
        <Alert variant="success" data-test-id="hub-deposit-success">
          {successMsg}
        </Alert>
      ) : null}

      {formError ? (
        <Alert variant="error" data-test-id="hub-deposit-form-error">
          {formError}
        </Alert>
      ) : null}

      {loadingHubs ? (
        <div className="flex flex-1 items-center justify-center py-12">
          <DotProgress />
        </div>
      ) : hubs.length === 0 && !loadError ? (
        <Alert variant="info" data-test-id="hub-deposit-no-hubs">
          No hay centros de efectivo configurados para este punto de venta. Configúralos en administración (vínculo POS
          ↔ centro de efectivo).
        </Alert>
      ) : (
        <div className="flex flex-col gap-4">
          <Select
            label="Centro de efectivo"
            placeholder="Centro de efectivo"
            options={hubOptions}
            value={hubId}
            onChange={(id) => setHubId(id != null ? String(id) : null)}
            required
            data-test-id="hub-deposit-select-hub"
          />

          {selectedHub ? (
            <div
              className="rounded-lg border px-4 py-3 text-sm"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)" }}
              data-test-id="hub-deposit-balance-box"
            >
              <span className="text-muted-foreground">Disponible en el centro de efectivo</span>
              <div className="mt-1 text-lg font-semibold tabular-nums" style={{ color: "var(--color-foreground)" }}>
                {currencyFmt.format(selectedHub.currentBalance)}
              </div>
            </div>
          ) : null}

          <TextField
            label="Monto a ingresar en caja"
            placeholder="0"
            type="currency"
            value={amountRaw}
            onChange={(e) => setAmountRaw(e.target.value)}
            data-test-id="hub-deposit-amount"
          />
          {amountError ? (
            <p className="text-xs text-red-600 dark:text-red-400" data-test-id="hub-deposit-amount-hint">
              {amountError}
            </p>
          ) : null}

          <TextField
            label="Motivo (opcional)"
            placeholder="Motivo (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            data-test-id="hub-deposit-reason"
          />

          <div className="flex justify-end pt-1">
            <Button
              variant="primary"
              disabled={!canSubmit || isPending}
              loading={isPending}
              onClick={onSubmit}
              data-test-id="hub-deposit-submit"
            >
              Confirmar ingreso
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
