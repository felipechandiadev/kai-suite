import { useState } from "react";
import { Alert, Button, Dialog, IconButton, TextField } from "@kai/ui";
import { liteFetch } from "@/lib/lite-client";
import { toUserMessage } from "@/lib/errors";
import { usePosCartStore } from "@/sections/pos/store/pos-cart.store";
import { CashSessionDetailDialog } from "@/sections/pos/components/CashSessionDetailDialog";
import { useSectionStore } from "./section-state.store";

type MovementKind = "deposit" | "withdrawal";

/**
 * Acciones de caja en la top bar (derecha del carro).
 * Solo visibles con sesión de caja abierta (sin sesión no hay a qué asignar el movimiento).
 */
export function CashSessionTitleBarActions() {
  const sessionOpen = usePosCartStore((s) => s.sessionOpen);
  const cashSessionId = usePosCartStore((s) => s.cashSessionId);
  const setPhase = usePosCartStore((s) => s.setPhase);

  const [dialog, setDialog] = useState<MovementKind | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = sessionOpen && !!cashSessionId;

  function openDialog(kind: MovementKind) {
    setDialog(kind);
    setAmount("");
    setReason("");
    setError(null);
  }

  function onCloseSession() {
    useSectionStore.getState().setActive("pos");
    setPhase("closing");
  }

  async function submitMovement() {
    if (!dialog || !cashSessionId) return;
    const value = Number(String(amount).replace(/\D/g, ""));
    if (!Number.isFinite(value) || value <= 0) {
      setError("Ingresá un monto mayor a 0");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const path =
        dialog === "deposit"
          ? `/lite/cash-sessions/${cashSessionId}/deposit`
          : `/lite/cash-sessions/${cashSessionId}/withdrawal`;
      await liteFetch(path, {
        method: "POST",
        body: JSON.stringify({
          amount: value,
          reason: reason.trim() || undefined,
        }),
      });
      setDialog(null);
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (!visible) {
    return null;
  }

  const dialogTitle =
    dialog === "deposit"
      ? "Ingreso de efectivo"
      : dialog === "withdrawal"
        ? "Egreso de efectivo"
        : "";

  return (
    <>
      <div className="titlebar__cash-actions" role="group" aria-label="Caja">
        <IconButton
          icon="ArrowLeftRight"
          variant="neutral"
          size="sm"
          ariaLabel="Movimientos de la sesión"
          title="Movimientos de la sesión"
          onClick={() => setDetailOpen(true)}
          data-test-id="titlebar-cash-session-detail"
        />
        <IconButton
          icon="BanknoteArrowDown"
          variant="neutral"
          size="sm"
          ariaLabel="Ingreso de efectivo"
          title="Ingreso de efectivo"
          onClick={() => openDialog("deposit")}
          data-test-id="titlebar-cash-deposit"
        />
        <IconButton
          icon="BanknoteArrowUp"
          variant="neutral"
          size="sm"
          ariaLabel="Egreso de efectivo"
          title="Egreso de efectivo"
          onClick={() => openDialog("withdrawal")}
          data-test-id="titlebar-cash-withdrawal"
        />
        <IconButton
          icon="Lock"
          variant="neutral"
          size="sm"
          ariaLabel="Cerrar caja"
          title="Cerrar caja"
          onClick={onCloseSession}
          data-test-id="titlebar-cash-close"
        />
      </div>

      <CashSessionDetailDialog
        open={detailOpen}
        sessionId={cashSessionId}
        onClose={() => setDetailOpen(false)}
      />

      <Dialog
        open={dialog != null}
        onClose={() => {
          if (!busy) setDialog(null);
        }}
        title={dialogTitle}
        actions={
          <>
            <Button
              type="button"
              variant="outlined"
              disabled={busy}
              onClick={() => setDialog(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              loading={busy}
              disabled={busy}
              onClick={() => void submitMovement()}
            >
              {dialog === "deposit" ? "Registrar ingreso" : "Registrar egreso"}
            </Button>
          </>
        }
        alertArea={error ? <Alert variant="error">{error}</Alert> : undefined}
      >
        <div className="flex flex-col gap-3">
          <TextField
            label="Monto"
            type="currency"
            currencySymbol="$"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value.replace(/\D/g, ""));
            }}
          />
          <TextField
            label="Motivo (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </Dialog>
    </>
  );
}
