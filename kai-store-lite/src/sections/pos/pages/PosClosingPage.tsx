import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Alert, Button, TextField } from "@kai/ui";
import { coreFetch } from "@/lib/http";
import { formatClp } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";
import { useAuth } from "@/providers/AuthProvider";
import {
  LITE_FALLBACK_METHODS,
  litePaymentLabel,
} from "../lib/lite-payment-labels";
import { fetchPrintCompanyHeader } from "../lib/print-company-header";
import { usePosCartStore } from "../store/pos-cart.store";

type PosCurrent = {
  enabledPaymentMethods?: string[];
};

function parseAmountCLPInput(raw: string): number {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

function currencyDisplayValue(amount: number): string {
  return amount > 0 ? String(Math.round(amount)) : "";
}

function normalizeEnabledMethods(raw: string[] | undefined): string[] {
  const allowed = new Set(LITE_FALLBACK_METHODS);
  const out: string[] = [];
  for (const m of raw ?? []) {
    const key = String(m ?? "")
      .trim()
      .toUpperCase();
    if (!key || !allowed.has(key) || out.includes(key)) continue;
    out.push(key);
  }
  return out;
}

export function PosClosingPage() {
  const { setPhase, openingFloat, cashSessionId, resetSession, setLastPrintWarning } =
    usePosCartStore();
  const { logout } = useAuth();
  const [methods, setMethods] = useState<string[]>([...LITE_FALLBACK_METHODS]);
  const [methodsReady, setMethodsReady] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const pos = await coreFetch<PosCurrent>("/lite/points-of-sale/current");
        if (cancelled) return;
        const enabled = normalizeEnabledMethods(pos.enabledPaymentMethods);
        const list = enabled.length > 0 ? enabled : [...LITE_FALLBACK_METHODS];
        setMethods(list);
        setCounts((prev) => {
          const next: Record<string, number> = {};
          for (const m of list) {
            next[m] =
              m === "CASH"
                ? (prev.CASH ?? openingFloat ?? 0)
                : (prev[m] ?? 0);
          }
          return next;
        });
      } catch {
        if (cancelled) return;
        setMethods([...LITE_FALLBACK_METHODS]);
        setCounts({ CASH: openingFloat ?? 0 });
      } finally {
        if (!cancelled) setMethodsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openingFloat]);

  const totalCounted = useMemo(
    () => Object.values(counts).reduce((s, n) => s + (Number(n) || 0), 0),
    [counts],
  );

  const cashCounted = counts.CASH ?? 0;

  async function close() {
    setBusy(true);
    setError(null);
    try {
      if (!cashSessionId) {
        throw new Error("No hay sesión de caja abierta.");
      }

      await coreFetch(`/lite/cash-sessions/${cashSessionId}/close`, {
        method: "POST",
        body: JSON.stringify({
          closingAmount: cashCounted,
          countsByMethod: counts,
        }),
      });

      try {
        const company = await fetchPrintCompanyHeader();
        await invoke("print_cash_closing", {
          counted: cashCounted,
          openingFloat,
          ...(company ? { company } : {}),
        });
      } catch (printErr) {
        setLastPrintWarning(`Caja cerrada. Impresión: ${toUserMessage(printErr)}`);
      }

      resetSession();
      logout();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center overflow-auto p-4"
      data-test-id="pos-closing"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-sm">
        <h1 className="text-center text-xl font-semibold tracking-tight text-foreground">
          Cierre de caja
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Fondo inicial {formatClp(openingFloat)}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {!methodsReady ? (
            <p className="text-center text-sm text-muted-foreground">
              Cargando medios de pago…
            </p>
          ) : (
            methods.map((method) => (
              <TextField
                key={method}
                label={litePaymentLabel(method)}
                type="currency"
                currencySymbol="$"
                alwaysShowLabel
                value={currencyDisplayValue(counts[method] ?? 0)}
                onChange={(e) => {
                  const amount = parseAmountCLPInput(e.target.value);
                  setCounts((prev) => ({ ...prev, [method]: amount }));
                }}
                data-test-id={`pos-closing-count-${method}`}
              />
            ))
          )}

          <div className="flex justify-between border-t border-border pt-3 text-sm font-semibold">
            <span>Total contado</span>
            <span className="font-mono tabular-nums" data-test-id="pos-closing-total">
              {formatClp(totalCounted)}
            </span>
          </div>

          {error ? <Alert variant="error">{error}</Alert> : null}

          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button type="button" variant="outlined" onClick={() => setPhase("sale")}>
              Volver
            </Button>
            <Button
              type="button"
              disabled={busy || !methodsReady}
              loading={busy}
              onClick={() => void close()}
              data-test-id="pos-closing-confirm"
            >
              Cerrar e imprimir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
