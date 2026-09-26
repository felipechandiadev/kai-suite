import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Alert, Button, TextField } from "@kai/ui";
import { liteFetch } from "@/lib/lite-client";
import { formatClp } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";
import { useAuth } from "@/providers/AuthProvider";
import { litePaymentLabel } from "../lib/lite-payment-labels";
import { fetchPrintCompanyHeader } from "../lib/print-company-header";
import { usePosCartStore } from "../store/pos-cart.store";

type CloseMethod = {
  method: string;
  amount: number;
  count: number;
};

type CloseMovement = {
  kind: string;
  amount: number;
  note?: string | null;
  createdAt: string;
};

type CloseSummary = {
  sessionId: string;
  openedAt: string;
  closedAt?: string | null;
  cashierName?: string | null;
  ticketCount: number;
  voidCount: number;
  salesTotal: number;
  averageTicket: number;
  methods: CloseMethod[];
  cashReceived: number;
  changeGiven: number;
  cashNet: number;
  openingAmount: number;
  deposits: number;
  withdrawals: number;
  expectedCash: number;
  movements: CloseMovement[];
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

function diffLabel(counted: number, expected: number): string {
  const diff = counted - expected;
  if (Math.abs(diff) < 0.5) return "Cuadra";
  if (diff > 0) return `Sobrante ${formatClp(diff)}`;
  return `Faltante ${formatClp(Math.abs(diff))}`;
}

export function PosClosingPage() {
  const { setPhase, cashSessionId, resetSession, setLastPrintWarning } = usePosCartStore();
  const { logout } = useAuth();
  const [summary, setSummary] = useState<CloseSummary | null>(null);
  const [cashDraft, setCashDraft] = useState("");
  const [declared, setDeclared] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cashSessionId) return;
    let cancelled = false;
    void liteFetch<CloseSummary>(`/lite/cash-sessions/${cashSessionId}/close-summary`)
      .then((row) => {
        if (!cancelled) setSummary(row);
      })
      .catch((e) => {
        if (!cancelled) setError(toUserMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [cashSessionId]);

  const otherMethods = (summary?.methods ?? []).filter((m) => m.method !== "CASH");
  const cashEntered = cashDraft.trim().length > 0;
  const cashCounted = cashEntered ? parseAmountCLPInput(cashDraft) : 0;

  async function close() {
    if (!cashEntered) {
      setError("Contá el efectivo del cajón");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (!cashSessionId) {
        throw new Error("No hay sesión de caja abierta.");
      }

      await liteFetch(`/lite/cash-sessions/${cashSessionId}/close`, {
        method: "POST",
        body: JSON.stringify({
          closingAmount: cashCounted,
          counted: cashCounted,
          countsByMethod: {
            CASH: cashCounted,
            ...declared,
          },
        }),
      });

      const closed = await liteFetch<CloseSummary>(
        `/lite/cash-sessions/${cashSessionId}/close-summary`,
      );

      try {
        const company = await fetchPrintCompanyHeader();
        await invoke("print_cash_closing", {
          sessionId: closed.sessionId,
          openedAt: closed.openedAt,
          closedAt: closed.closedAt ?? null,
          cashierName: closed.cashierName ?? null,
          ticketCount: closed.ticketCount,
          voidCount: closed.voidCount,
          salesTotal: closed.salesTotal,
          averageTicket: closed.averageTicket,
          methods: closed.methods,
          cashReceived: closed.cashReceived,
          changeGiven: closed.changeGiven,
          cashNet: closed.cashNet,
          openingAmount: closed.openingAmount,
          deposits: closed.deposits,
          withdrawals: closed.withdrawals,
          expectedCash: closed.expectedCash,
          counted: cashCounted,
          movements: closed.movements,
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
        {summary ? (
          <p className="mt-1 text-center font-mono text-xs text-muted-foreground">
            Sesión {summary.sessionId.slice(-8)}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          {!summary && !error ? (
            <p className="text-center text-sm text-muted-foreground">Cargando sesión…</p>
          ) : null}

          {summary ? (
            <>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Fondo</dt>
                <dd className="text-right font-mono tabular-nums">
                  {formatClp(summary.openingAmount)}
                </dd>
                <dt className="text-muted-foreground">Efectivo recibido</dt>
                <dd className="text-right font-mono tabular-nums">
                  {formatClp(summary.cashReceived)}
                </dd>
                <dt className="text-muted-foreground">Vuelto</dt>
                <dd className="text-right font-mono tabular-nums">
                  {formatClp(summary.changeGiven)}
                </dd>
                <dt className="text-muted-foreground">Ingresos</dt>
                <dd className="text-right font-mono tabular-nums">
                  {formatClp(summary.deposits)}
                </dd>
                <dt className="text-muted-foreground">Retiros</dt>
                <dd className="text-right font-mono tabular-nums">
                  {formatClp(summary.withdrawals)}
                </dd>
                <dt className="font-medium text-foreground">Esperado en cajón</dt>
                <dd
                  className="text-right font-mono font-semibold tabular-nums"
                  data-test-id="pos-closing-expected"
                >
                  {formatClp(summary.expectedCash)}
                </dd>
              </dl>

              <TextField
                label="Efectivo contado"
                type="currency"
                currencySymbol="$"
                alwaysShowLabel
                value={cashDraft}
                onChange={(e) => setCashDraft(e.target.value)}
                data-test-id="pos-closing-count-CASH"
              />
              <div className="flex justify-between text-sm font-semibold">
                <span>Diferencia</span>
                <span className="font-mono tabular-nums" data-test-id="pos-closing-diff">
                  {cashEntered ? diffLabel(cashCounted, summary.expectedCash) : "—"}
                </span>
              </div>

              {otherMethods.map((method) => (
                <div key={method.method} className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {litePaymentLabel(method.method)} según sistema{" "}
                    {formatClp(method.amount)}
                  </p>
                  <TextField
                    label={litePaymentLabel(method.method)}
                    type="currency"
                    currencySymbol="$"
                    alwaysShowLabel
                    value={currencyDisplayValue(declared[method.method] ?? 0)}
                    onChange={(e) => {
                      const amount = parseAmountCLPInput(e.target.value);
                      setDeclared((prev) => ({ ...prev, [method.method]: amount }));
                    }}
                    data-test-id={`pos-closing-count-${method.method}`}
                  />
                </div>
              ))}
            </>
          ) : null}

          {error ? <Alert variant="error">{error}</Alert> : null}

          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button type="button" variant="outlined" onClick={() => setPhase("sale")}>
              Volver
            </Button>
            <Button
              type="button"
              disabled={busy || !summary}
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
