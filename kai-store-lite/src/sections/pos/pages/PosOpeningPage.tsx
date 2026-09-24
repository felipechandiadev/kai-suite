import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Alert, Button, TextField } from "@kai/ui";
import { liteFetch } from "@/lib/lite-client";
import { toUserMessage } from "@/lib/errors";
import type { LitePointOfSale } from "@/lib/lite-api";
import {
  attachResolvedOpenSession,
  findOpenCashSession,
} from "../lib/resolve-open-session";
import { fetchPrintCompanyHeader } from "../lib/print-company-header";
import { usePosCartStore } from "../store/pos-cart.store";

type Props = {
  /** Error del bootstrap del POS (p. ej. Core offline). */
  bootstrapError?: string | null;
};

/**
 * Solo se monta cuando el bootstrap ya resolvió que NO hay sesión OPEN.
 * No vuelve a consultar al montar (evita carreras con PosRoutes).
 */
export function PosOpeningPage({ bootstrapError = null }: Props) {
  const {
    openingFloat,
    setOpeningFloat,
    setSessionOpen,
    setPhase,
    setCashSessionId,
    setPointOfSaleId,
    setLastPrintWarning,
    sessionOpen,
    cashSessionId,
  } = usePosCartStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(bootstrapError);

  // Si el bootstrap ya adjuntó sesión, no mostrar form (Navigate en PosRoutes).
  if (sessionOpen && cashSessionId) {
    return null;
  }

  async function openSession() {
    setBusy(true);
    setErr(null);
    try {
      const posRes = await liteFetch<{ items: LitePointOfSale[] }>("/lite/points-of-sale");
      const pos = posRes.items?.[0];
      if (!pos?.id) {
        throw new Error("No hay punto de venta. Ejecutá seed en Admin → Acerca de.");
      }

      try {
        const session = await liteFetch<{ id: string }>("/lite/cash-sessions", {
          method: "POST",
          body: JSON.stringify({
            pointOfSaleId: pos.id,
            openingAmount: openingFloat,
          }),
        });

        setPointOfSaleId(pos.id);
        setCashSessionId(session.id);
        setSessionOpen(true);

        try {
          const company = await fetchPrintCompanyHeader();
          await invoke("print_cash_opening", {
            amount: openingFloat,
            ...(company ? { company } : {}),
          });
        } catch (printErr) {
          setLastPrintWarning(`Caja abierta. Impresión: ${toUserMessage(printErr)}`);
        }

        setPhase("sale");
      } catch (e) {
        const msg = toUserMessage(e);
        if (/sesión de caja abierta|ya existe/i.test(msg)) {
          const open = await findOpenCashSession();
          if (open) {
            attachResolvedOpenSession(open);
            return;
          }
        }
        throw e;
      }
    } catch (e) {
      setErr(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col items-center justify-center px-4 py-8"
      data-test-id="pos-opening-page"
    >
      <div className="flex w-full max-w-sm flex-col items-stretch gap-5">
        <header className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Apertura de caja
          </h1>
        </header>

        <TextField
          label="Fondo"
          type="currency"
          currencySymbol="$"
          value={String(openingFloat || "")}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            setOpeningFloat(raw === "" ? 0 : Number.parseInt(raw, 10) || 0);
          }}
        />
        {err ? <Alert variant="error">{err}</Alert> : null}
        <Button
          type="button"
          className="w-full"
          disabled={busy}
          loading={busy}
          onClick={() => void openSession()}
        >
          Abrir caja
        </Button>
      </div>
    </div>
  );
}
