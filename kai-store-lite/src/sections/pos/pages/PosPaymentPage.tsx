import { useEffect, useState } from "react";
import { Alert, Button, IconButton, TextField } from "@kai/ui";
import { liteFetch } from "@/lib/lite-client";
import { formatClp } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";
import {
  cartTotal,
  paymentComplete,
  paymentOverpay,
  paymentRemaining,
  paymentsSum,
  paymentStatusLabel,
  usePosCartStore,
  type PaymentLine,
} from "../store/pos-cart.store";
import {
  LITE_FALLBACK_METHODS,
  litePaymentLabel,
} from "../lib/lite-payment-labels";
import { fetchPrintCompanyHeader } from "../lib/print-company-header";
import { useLitePosCompactLayout } from "../hooks/useLitePosCompactLayout";
import {
  fetchPrintSalePreview,
  printSaleTicket,
} from "@/sections/admin/api/lite-print.api";
import {
  LiteSaleReceiptDialog,
  type LiteSaleReceiptPayload,
} from "../components/LiteSaleReceiptDialog";

type PosCurrent = {
  enabledPaymentMethods?: string[];
};

/** Monto CLP desde TextField type="currency" (dígitos). */
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

/** Una línea por medio habilitado; montos en 0 (el cajero completa). */
function buildPreloadedPayments(methods: string[], _total: number): PaymentLine[] {
  return methods.map((method) => ({
    id: `pay-${method}`,
    method,
    amount: 0,
  }));
}

function paymentsMatchMethods(payments: PaymentLine[], methods: string[]): boolean {
  if (payments.length !== methods.length) return false;
  const set = new Set(payments.map((p) => p.method));
  return methods.every((m) => set.has(m));
}

export function PosPaymentPage() {
  const {
    lines,
    payments,
    setPayments,
    updatePayment,
    clear,
    clearPayments,
    setPhase,
    setLastPrintWarning,
  } = usePosCartStore();
  const compactLayout = useLitePosCompactLayout();
  const [methods, setMethods] = useState<string[]>([]);
  const [methodsReady, setMethodsReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<LiteSaleReceiptPayload | null>(null);

  const total = cartTotal(lines);
  const paid = paymentsSum(payments);
  const remaining = paymentRemaining(total, payments);
  const overpay = paymentOverpay(total, payments);
  const statusLabel = paymentStatusLabel(total, payments);
  const canConfirm =
    methodsReady && methods.length > 0 && paymentComplete(total, payments);

  const statusComplete = canConfirm;
  const statusHasPayments = paid > 0;
  const statusBoxTone = statusComplete
    ? "bg-emerald-100/70 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100"
    : statusHasPayments
      ? "bg-red-100/70 text-red-900 dark:bg-red-900/30 dark:text-red-100"
      : "bg-slate-100/80 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const pos = await liteFetch<PosCurrent>("/lite/points-of-sale/current");
        if (cancelled) return;
        const enabled = normalizeEnabledMethods(pos.enabledPaymentMethods);
        setMethods(enabled.length > 0 ? enabled : [...LITE_FALLBACK_METHODS]);
      } catch {
        if (cancelled) return;
        setMethods([...LITE_FALLBACK_METHODS]);
      } finally {
        if (!cancelled) setMethodsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Precargar un TextField por cada medio habilitado en el POS.
  useEffect(() => {
    if (!methodsReady || methods.length === 0) return;
    if (paymentsMatchMethods(payments, methods)) return;
    setPayments(buildPreloadedPayments(methods, total));
  }, [methods, methodsReady, payments, setPayments, total]);

  function fillRemaining(id: string) {
    if (remaining <= 0) return;
    const line = payments.find((p) => p.id === id);
    if (!line) return;
    updatePayment(id, { amount: Math.round(line.amount + remaining) });
  }

  function closeReceipt() {
    setReceipt(null);
    clear();
    setPhase("sale");
  }

  async function confirm() {
    const activePayments = payments.filter((p) => (Number(p.amount) || 0) > 0);
    if (!canConfirm || activePayments.length === 0) return;
    setBusy(true);
    setError(null);
    setLastPrintWarning(null);
    try {
      const primary = activePayments[0]!;
      const printLines = lines.map((l) => ({
        name: l.name,
        qty: l.qty,
        unitPrice: l.unitPrice,
      }));
      const sale = await liteFetch<{ id: string }>("/lite/pos/sale", {
        method: "POST",
        body: JSON.stringify({
          lines: lines.map((l) => ({
            variantId: l.variantId,
            qty: l.qty,
            unitPrice: l.unitPrice,
          })),
          method: primary.method,
          total,
          payments: activePayments.map((p) => ({
            method: p.method,
            amount: p.amount,
            ...(p.reference?.trim() ? { reference: p.reference.trim() } : {}),
          })),
        }),
      });

      const company = await fetchPrintCompanyHeader();
      const methodLabel =
        activePayments.length > 1
          ? activePayments
              .map((p) => `${litePaymentLabel(p.method)} ${formatClp(p.amount)}`)
              .join(" + ")
          : litePaymentLabel(primary.method);

      let printError: string | null = null;
      try {
        await printSaleTicket({
          saleId: sale.id,
          total,
          lines: printLines,
          method: methodLabel,
          company,
        });
      } catch (printErr) {
        printError = toUserMessage(printErr);
        setLastPrintWarning(`Venta OK. Impresión: ${printError}`);
      }

      let preview = null;
      try {
        preview = await fetchPrintSalePreview({
          saleId: sale.id,
          total,
          lines: printLines,
          method: methodLabel,
          company,
        });
      } catch {
        preview = null;
      }

      setReceipt({
        saleId: sale.id,
        total,
        change: overpay,
        methodLabel,
        payments: activePayments.map((p) => ({
          method: p.method,
          amount: p.amount,
          ...(p.reference?.trim() ? { reference: p.reference.trim() } : {}),
        })),
        lines: printLines,
        company,
        printError,
        preview,
      });
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (lines.length === 0 && !receipt) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-3 p-6"
        data-test-id="pos-payment-empty"
      >
        <p className="text-sm text-muted-foreground">El carrito está vacío.</p>
        <Button
          type="button"
          variant="outlined"
          onClick={() => {
            clearPayments();
            setPhase("sale");
          }}
        >
          Volver a venta
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-3 p-3 sm:p-4"
      data-test-id="pos-payment"
    >
      <header
        className="flex shrink-0 flex-wrap items-center justify-between gap-3"
        data-test-id="pos-payment-header"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <IconButton
            icon="ArrowLeft"
            variant="outlined"
            size="lg"
            ariaLabel="Volver a venta"
            title="Volver"
            disabled={busy || !!receipt}
            onClick={() => {
              clearPayments();
              setPhase("sale");
            }}
            data-test-id="pos-payment-back"
          />
          <div className="flex min-w-32 flex-col rounded-lg bg-muted/40 px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">Total a pagar</span>
            <span
              className="text-xl font-bold tabular-nums sm:text-2xl"
              data-test-id="pos-payment-total"
            >
              {formatClp(total)}
            </span>
          </div>
          <div className="flex min-w-32 flex-col rounded-lg bg-muted/40 px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">
              {overpay > 0 ? "Vuelto" : "Restante"}
            </span>
            <span
              className="text-xl font-bold tabular-nums sm:text-2xl"
              data-test-id="pos-payment-remaining"
            >
              {formatClp(overpay > 0 ? overpay : remaining)}
            </span>
          </div>
          <div className={`flex min-w-32 flex-col rounded-lg px-3 py-2 ${statusBoxTone}`}>
            <span className="text-sm font-medium opacity-80">Estado del pago</span>
            <span className="text-xl font-bold sm:text-2xl" data-test-id="pos-payment-status">
              {statusLabel}
            </span>
          </div>
        </div>
        <IconButton
          icon="CircleCheck"
          variant="primary"
          size="lg"
          className="shrink-0"
          ariaLabel="Confirmar e imprimir"
          title="Confirmar e imprimir"
          disabled={!canConfirm || busy || !!receipt}
          isLoading={busy}
          onClick={() => void confirm()}
          data-test-id="pos-payment-confirm"
        />
      </header>

      {!methodsReady ? (
        <Alert variant="info">Cargando medios de pago del punto de venta…</Alert>
      ) : null}
      {methodsReady && methods.length === 0 ? (
        <Alert variant="warning">
          No hay medios de pago habilitados en este punto de venta. Configuralos en Admin →
          Configuración → Punto de venta.
        </Alert>
      ) : null}
      {error ? <Alert variant="error">{error}</Alert> : null}

      <div
        className={
          compactLayout
            ? "grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto"
            : "grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-4"
        }
      >
        <section
          className="flex min-h-0 flex-col gap-3 rounded-xl border border-border bg-background p-4"
          aria-label="Resumen de venta"
          data-test-id="pos-payment-cart-summary"
        >
          <h2 className="text-sm font-semibold text-foreground">Resumen</h2>
          <ul className="min-h-0 flex-1 space-y-2 overflow-auto">
            {lines.map((l) => (
              <li
                key={l.variantId}
                className="flex items-start justify-between gap-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground">{l.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {l.qty} × {formatClp(l.unitPrice)}
                  </span>
                </span>
                <span className="shrink-0 font-mono tabular-nums">
                  {formatClp(l.qty * l.unitPrice)}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold">
            <span>Total</span>
            <span className="font-mono tabular-nums">{formatClp(total)}</span>
          </div>
        </section>

        <section
          className="flex min-h-0 flex-col gap-3 rounded-xl border border-border bg-background p-4"
          aria-label="Medios de pago"
          data-test-id="pos-payment-methods"
        >
          <h2 className="text-sm font-semibold text-foreground">Pagos</h2>
          <div className="min-h-0 flex-1 space-y-3 overflow-auto">
            {payments.map((p, index) => (
              <PaymentMethodField
                key={p.id}
                payment={p}
                index={index}
                remaining={remaining}
                busy={busy || !!receipt}
                onAmountChange={(raw) => {
                  updatePayment(p.id, { amount: parseAmountCLPInput(raw) });
                }}
                onReferenceChange={(ref) => updatePayment(p.id, { reference: ref })}
                onFillRemaining={() => fillRemaining(p.id)}
              />
            ))}
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-sm">
            <span className="text-muted-foreground">Pagado</span>
            <span
              className="font-mono font-semibold tabular-nums"
              data-test-id="pos-payment-paid"
            >
              {formatClp(paid)}
            </span>
          </div>
        </section>
      </div>

      <LiteSaleReceiptDialog
        open={receipt != null}
        data={receipt}
        onClose={closeReceipt}
      />
    </div>
  );
}

function PaymentMethodField({
  payment: p,
  index,
  remaining,
  busy,
  onAmountChange,
  onReferenceChange,
  onFillRemaining,
}: {
  payment: PaymentLine;
  index: number;
  remaining: number;
  busy: boolean;
  onAmountChange: (raw: string) => void;
  onReferenceChange: (ref: string) => void;
  onFillRemaining: () => void;
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border p-3"
      data-test-id={`pos-payment-method-row-${p.method}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">
          {litePaymentLabel(p.method)}
        </span>
        <IconButton
          icon="ArrowUpToLine"
          variant="action"
          size="sm"
          ariaLabel="Completar restante"
          title="Completar restante"
          disabled={busy || remaining <= 0}
          onClick={onFillRemaining}
          data-test-id={`pos-payment-fill-remaining-${p.method}`}
        />
      </div>
      <TextField
        label="Monto"
        type="currency"
        currencySymbol="$"
        alwaysShowLabel
        value={currencyDisplayValue(p.amount)}
        onChange={(e) => onAmountChange(e.target.value)}
        data-test-id={
          index === 0
            ? "pos-payment-default-cash-amount"
            : `pos-payment-line-amount-${p.method}`
        }
      />
      {p.method === "TRANSFER" ? (
        <TextField
          label="Referencia"
          value={p.reference ?? ""}
          onChange={(e) => onReferenceChange(e.target.value)}
          data-test-id={`pos-payment-ref-${p.method}`}
        />
      ) : null}
    </div>
  );
}
