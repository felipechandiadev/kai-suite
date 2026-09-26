import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Alert, Button, Dialog, IconButton } from "@kai/ui";
import { formatClp } from "@/lib/format";
import { liteFetch } from "@/lib/lite-client";
import { toUserMessage } from "@/lib/errors";
import { litePaymentLabel } from "@/sections/pos/lib/lite-payment-labels";
import { fetchPrintCompanyHeader } from "@/sections/pos/lib/print-company-header";

type LedgerLine = {
  label: string;
  createdAt: string;
  kind: string;
  code: string;
  direction: "in" | "out";
  amount: number;
  balance: number;
};

type SessionDetail = {
  sessionId: string;
  salesTotal: number;
  methods: { method: string; amount: number }[];
  cashNet: number;
  openingAmount: number;
  expectedCash: number;
  ledger: LedgerLine[];
};

const LEDGER_KIND_LABEL: Record<string, string> = {
  OPENING: "Apertura",
  SALE: "Venta",
  DEPOSIT: "Ingreso de dinero",
  WITHDRAWAL: "Retiro de dinero",
};

function shortCode(code: string): string {
  const t = code.trim();
  if (!t) return "";
  return t.length > 8 ? t.slice(-8) : t;
}

function formatSessionWhen(raw: string): string {
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString("es-CL", { hourCycle: "h23" });
}

type Props = {
  open: boolean;
  sessionId: string | null;
  caption?: string;
  onClose: () => void;
};

export function CashSessionDetailDialog({ open, sessionId, caption, onClose }: Props) {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printBusy, setPrintBusy] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !sessionId) {
      setDetail(null);
      setError(null);
      setPrintError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPrintError(null);
    setDetail(null);
    void liteFetch<SessionDetail>(`/lite/cash-sessions/${sessionId}/close-summary`)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch((e) => {
        if (!cancelled) setError(toUserMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, sessionId]);

  async function printDetail() {
    if (!detail) return;
    setPrintBusy(true);
    setPrintError(null);
    try {
      const company = await fetchPrintCompanyHeader();
      await invoke("print_cash_session_detail", {
        args: {
          sessionId: detail.sessionId,
          openingAmount: detail.openingAmount,
          salesTotal: detail.salesTotal,
          expectedCash: detail.expectedCash,
          methods: detail.methods.map((method) => ({
            method: method.method,
            amount: method.method === "CASH" ? detail.cashNet : method.amount,
          })),
          ledger: detail.ledger.map((line) => ({
            label: line.label,
            createdAt: line.createdAt,
            kind: line.kind,
            code: line.code,
            direction: line.direction,
            amount: line.amount,
            balance: line.balance,
          })),
          ...(company ? { company } : {}),
        },
      });
    } catch (e) {
      setPrintError(toUserMessage(e));
    } finally {
      setPrintBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Detalle de sesión"
      size="xxl"
      actions={
        <Button type="button" variant="outlined" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="space-y-3 text-sm">
        {caption ? <p className="text-muted-foreground">{caption}</p> : null}
        {error ? <Alert variant="error">{error}</Alert> : null}
        {loading ? (
          <p className="text-muted-foreground">Cargando…</p>
        ) : error || !detail ? null : (
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="max-h-[50vh] min-w-0 flex-1 overflow-auto rounded-lg border border-border">
              <table className="w-full min-w-0 text-left text-sm">
                <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Fecha</th>
                    <th className="px-3 py-2 font-medium">Tipo</th>
                    <th className="px-3 py-2 font-medium">Código</th>
                    <th className="px-3 py-2 font-medium">Movimiento</th>
                    <th className="px-3 py-2 text-right font-medium">Monto</th>
                    <th className="px-3 py-2 text-right font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.ledger.map((line, index) => {
                    const incoming = line.direction === "in";
                    const tone = incoming
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400";
                    return (
                      <tr
                        key={`${line.createdAt}-${line.label}-${index}`}
                        className="border-t border-border/70"
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          {formatSessionWhen(line.createdAt)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {LEDGER_KIND_LABEL[line.kind] ?? line.kind}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{shortCode(line.code)}</td>
                        <td className="px-3 py-2">{line.label}</td>
                        <td className={`px-3 py-2 text-right font-mono tabular-nums ${tone}`}>
                          {incoming ? "+" : "−"}
                          {formatClp(line.amount)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">
                          {formatClp(line.balance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <aside
              className="w-full shrink-0 space-y-3 rounded-lg border border-border bg-muted/20 p-3 md:w-60"
              data-test-id="cash-session-status"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Efectivo en caja</p>
                  <p className="font-mono text-lg font-semibold tabular-nums text-foreground">
                    {formatClp(detail.expectedCash)}
                  </p>
                </div>
                <IconButton
                  icon="Printer"
                  variant="action"
                  size="sm"
                  ariaLabel="Imprimir detalle de sesión"
                  title="Imprimir"
                  disabled={printBusy}
                  isLoading={printBusy}
                  onClick={() => void printDetail()}
                  data-test-id="cash-session-print"
                />
              </div>
              {printError ? <Alert variant="error">{printError}</Alert> : null}
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Fondo de apertura</dt>
                  <dd className="font-mono tabular-nums">{formatClp(detail.openingAmount)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Ventas totales</dt>
                  <dd className="font-mono tabular-nums">{formatClp(detail.salesTotal)}</dd>
                </div>
              </dl>
              {detail.methods.length > 0 ? (
                <div className="space-y-2 border-t border-border pt-3">
                  <p className="text-xs font-medium text-foreground">Detalles de ventas</p>
                  <dl className="space-y-2 text-sm">
                    {detail.methods.map((method) => (
                      <div key={method.method} className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">{litePaymentLabel(method.method)}</dt>
                        <dd className="font-mono tabular-nums">
                          {formatClp(method.method === "CASH" ? detail.cashNet : method.amount)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
            </aside>
          </div>
        )}
      </div>
    </Dialog>
  );
}
