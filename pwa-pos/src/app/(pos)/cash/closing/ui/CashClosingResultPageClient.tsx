"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  describePrintFormat,
  getPosDocumentPrintFormat,
  isDocumentPrintFormat,
} from "@flowstore/print-service-client";
import { Alert, Button } from "@/shared/admin-shared";
import { getCompanyDetailsAction } from "@/features/company/actions/company.action";
import type { CompanyDetails } from "@/features/company/infrastructure/company.request";
import type { CashClosingPrintInput } from "@/features/cash-closing/lib/cash-closing-print.types";
import { normalizeCloseCounted } from "@/features/cash-closing/lib/cash-closing-print-format";
import {
  buildCashClosingArqueoPreviewHtml,
  printCashClosingArqueo,
} from "@/features/cash-closing/lib/print-cash-closing-arqueo";
import {
  clearCashClosingResultSnapshot,
  readCashClosingResultSnapshot,
  type CashClosingResultSnapshot,
} from "@/features/cash-closing/lib/cash-closing-result-storage";

const currencyFmt = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function formatClosingHeaderDate(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
}

export default function CashClosingResultPageClient() {
  const router = useRouter();
  const { data: authSession } = useSession();
  const signOutStartedRef = useRef(false);
  const autoPrintSessionRef = useRef<string | null>(null);

  const [snapshot, setSnapshot] = useState<CashClosingResultSnapshot | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [printCompany, setPrintCompany] = useState<CompanyDetails | null>(null);
  const [printCtxReady, setPrintCtxReady] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const data = readCashClosingResultSnapshot();
    setSnapshot(data);
    setHydrated(true);
    if (!data) {
      router.replace("/pos");
    }
  }, [router]);

  const finishUserSession = useCallback(() => {
    if (signOutStartedRef.current) return;
    signOutStartedRef.current = true;
    setSigningOut(true);
    clearCashClosingResultSnapshot();
    void signOut({ callbackUrl: "/" });
  }, []);

  const buildArqueoPrintInput = useCallback(
    (snap: CashClosingResultSnapshot, company: CompanyDetails | null): CashClosingPrintInput => {
      const res = snap.closeResult;
      const counted = normalizeCloseCounted(res.counted);
      return {
        closedAt: snap.closedAt,
        sessionOpenedAt: snap.sessionOpenedAt,
        cashSessionId: res.sessionId?.trim() || "—",
        message: res.message,
        usedBlindCount: Boolean(res.usedBlindCount),
        countedGrand: snap.countedGrand,
        systemCashExpected:
          typeof res.systemCashExpected === "number" ? res.systemCashExpected : undefined,
        difference: typeof res.difference === "number" ? res.difference : undefined,
        salesTotal: typeof res.salesTotal === "number" ? res.salesTotal : undefined,
        counted,
        notes: snap.notes.trim() || undefined,
        pointOfSaleName: snap.pointOfSaleName,
        branchName: snap.branchName,
        operatorName: snap.operatorName,
        company,
      };
    },
    [],
  );

  const arqueoPrintInput = useMemo(() => {
    if (!snapshot || !printCtxReady) return null;
    return buildArqueoPrintInput(snapshot, printCompany);
  }, [buildArqueoPrintInput, printCompany, printCtxReady, snapshot]);

  const arqueoPreviewHtml = useMemo(() => {
    if (!arqueoPrintInput) return null;
    return buildCashClosingArqueoPreviewHtml(arqueoPrintInput);
  }, [arqueoPrintInput]);

  useEffect(() => {
    if (!snapshot) return;

    let cancelled = false;
    let printTimer: number | undefined;
    setPrintCtxReady(false);

    void (async () => {
      let company: CompanyDetails | null = null;
      try {
        company = (await getCompanyDetailsAction()) ?? null;
      } catch {
        company = null;
      }
      if (cancelled) return;

      setPrintCompany(company);
      setPrintCtxReady(true);

      const input = buildArqueoPrintInput(snapshot, company);
      const key = input.cashSessionId;
      if (autoPrintSessionRef.current === key) return;
      autoPrintSessionRef.current = key;

      printTimer = window.setTimeout(() => {
        if (cancelled) return;
        printCashClosingArqueo(input);
        const format = getPosDocumentPrintFormat("cashClosing");
        setPrintStatus(
          isDocumentPrintFormat(format)
            ? `Documento de arqueo enviado a impresión (${describePrintFormat(format)}).`
            : `Ticket de arqueo enviado a impresión (${describePrintFormat(format)}).`,
        );
      }, 400);
    })();

    return () => {
      cancelled = true;
      if (printTimer !== undefined) clearTimeout(printTimer);
    };
  }, [buildArqueoPrintInput, snapshot]);

  const onReprintArqueo = useCallback(() => {
    if (!arqueoPrintInput) return;
    printCashClosingArqueo(arqueoPrintInput);
    setPrintStatus("Reimpresión de arqueo enviada.");
  }, [arqueoPrintInput]);

  if (!hydrated || !snapshot) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-12 text-sm text-muted-foreground">
        Cargando resultado…
      </div>
    );
  }

  const closeResult = snapshot.closeResult;
  const blind = Boolean(closeResult.usedBlindCount);
  const diff = typeof closeResult.difference === "number" ? closeResult.difference : null;
  const counted = closeResult.counted;
  const headerDateLabel = formatClosingHeaderDate(snapshot.sessionOpenedAt);
  const operatorName =
    snapshot.operatorName ||
    authSession?.user?.name?.trim() ||
    authSession?.user?.email?.trim() ||
    null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Cierre de caja</h1>
        <p className="mt-1 text-xs text-muted-foreground">{headerDateLabel}</p>
        <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
          {blind
            ? "Resultado del arqueo: comparación entre efectivo contado y el saldo teórico de la sesión."
            : "La sesión de caja se cerró correctamente."}
        </p>
        {operatorName ? (
          <p className="mt-1 text-xs text-muted-foreground">Operador: {operatorName}</p>
        ) : null}
      </div>

      <Alert variant="success" className="text-sm">
        {closeResult.message ?? "Sesión de caja cerrada correctamente."}
      </Alert>

      {printStatus ? (
        <Alert variant="info" className="text-sm">
          {printStatus} Revisa la cola en KaiPrinters. Formato en{" "}
          <span className="font-medium text-foreground">Ajustes → Impresión local → Arqueo de caja</span>.
        </Alert>
      ) : null}

      {arqueoPreviewHtml ? (
        <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Vista previa del arqueo</h2>
            <Button type="button" variant="outlined" size="sm" onClick={onReprintArqueo}>
              Reimprimir arqueo
            </Button>
          </div>
          <div className="mt-3 overflow-hidden rounded-lg border border-border bg-muted/20">
            <iframe
              title="Vista previa arqueo de caja"
              srcDoc={arqueoPreviewHtml}
              className="mx-auto block min-h-[280px] w-full max-w-[420px] bg-white"
              sandbox=""
            />
          </div>
        </section>
      ) : null}

      {blind && counted ? (
        <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Cuadre (cierre ciego)</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Total declarado (todos los medios)</dt>
              <dd className="tabular-nums text-base font-semibold">
                {currencyFmt.format(Math.round(Number(closeResult.countedGrand ?? snapshot.countedGrand)))}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Efectivo teórico en sesión</dt>
              <dd className="tabular-nums text-base font-semibold">
                {currencyFmt.format(Math.round(Number(closeResult.systemCashExpected ?? 0)))}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Efectivo contado</dt>
              <dd className="tabular-nums text-base font-semibold">
                {currencyFmt.format(Math.round(Number(counted.cash ?? 0)))}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Diferencia (efectivo contado − efectivo teórico)</dt>
              <dd
                className={`tabular-nums text-base font-semibold ${
                  diff != null && Math.abs(diff) > 0.01 ? "text-amber-700 dark:text-amber-400" : "text-foreground"
                }`}
              >
                {diff != null ? currencyFmt.format(Math.round(diff)) : "—"}
              </dd>
            </div>
          </dl>
          {typeof closeResult.salesTotal === "number" ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Total de ventas de referencia en sesión:{" "}
              <span className="font-mono tabular-nums text-foreground">
                {currencyFmt.format(Math.round(closeResult.salesTotal))}
              </span>
              .
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="flex justify-end pt-1">
        <Button type="button" variant="primary" onClick={finishUserSession} disabled={signingOut}>
          {signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
        </Button>
      </div>
    </div>
  );
}
