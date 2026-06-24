"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  PrintServiceConnection,
  buildWebSocketUrl,
  printServicePageRequiresTls,
  readPrintServiceConfigFromStorage,
  readPosDocumentPrintFormatsFromStorage,
  readPosPurposePrinterAliasesFromStorage,
  type PosDocumentPrintKind,
  type PrintFormat,
  PrintFormatSelector,
  writePosDocumentPrintFormatsToStorage,
  writePosPurposePrinterAliasesToStorage,
  writePrintServiceConfigToStorage,
  KaiPrintersDownloadSection,
} from "@flowstore/print-service-client";
import { Button, Select, Switch, TextField } from "@/shared/admin-shared";
import { printPosDocumentTest } from "@/features/pos-print/lib/print-pos-document-test";
import { DocumentPrintTestButton } from "@/features/pos-print/ui/DocumentPrintTestButton";
import { PosCustomerDisplaySettingsSection } from "@/features/customer-display/ui/PosCustomerDisplaySettingsSection";

type Props = {
  className?: string;
};

function stringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim());
}

const INITIAL_DOC_PRINT_FORMATS: Record<PosDocumentPrintKind, PrintFormat> = {
  sale: "ticket_80mm",
  quotation: "ticket_80mm",
  backorder: "ticket_80mm",
  customerCreditNote: "ticket_80mm",
  cashClosing: "ticket_80mm",
  cashCountSheet: "document_a4",
  cashSessionOpening: "ticket_80mm",
};

function aliasSelectOptions(aliases: string[], current: string) {
  const ids = new Set<string>();
  const options: { id: string; label: string }[] = [{ id: "", label: "Ninguna" }];
  if (current && !aliases.includes(current)) {
    options.push({ id: current, label: current });
    ids.add(current);
  }
  for (const a of aliases) {
    if (ids.has(a)) continue;
    ids.add(a);
    options.push({ id: a, label: a });
  }
  return options;
}

export function PosLocalPrintPreferencesForm({ className = "" }: Props) {
  const formId = useId();
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState("14567");
  const [wssPort, setWssPort] = useState("14568");
  const [useTls, setUseTls] = useState(false);
  const [ticketsAlias, setTicketsAlias] = useState("");
  const [documentsAlias, setDocumentsAlias] = useState("");
  const [ticketAliases, setTicketAliases] = useState<string[]>([]);
  const [documentAliases, setDocumentAliases] = useState<string[]>([]);
  const [aliasesLoading, setAliasesLoading] = useState(false);
  const [docPrintFormats, setDocPrintFormats] =
    useState<Record<PosDocumentPrintKind, PrintFormat>>(INITIAL_DOC_PRINT_FORMATS);
  const [storageHydrated, setStorageHydrated] = useState(false);
  const [testPrintBusyKind, setTestPrintBusyKind] = useState<PosDocumentPrintKind | null>(null);

  useEffect(() => {
    const c = readPrintServiceConfigFromStorage();
    setHost(c.host);
    setPort(String(c.port));
    setWssPort(String(c.wssPort));
    setUseTls(c.useTls);
    const a = readPosPurposePrinterAliasesFromStorage();
    setTicketsAlias(a.ticketsAlias);
    setDocumentsAlias(a.documentsAlias);
    setDocPrintFormats(readPosDocumentPrintFormatsFromStorage());
    setStorageHydrated(true);
  }, []);

  const url = useMemo(() => {
    const tls = printServicePageRequiresTls() || useTls;
    const p = Number(tls ? wssPort : port) || (tls ? 14568 : 14567);
    return buildWebSocketUrl(host, p, tls);
  }, [host, port, wssPort, useTls]);

  const connOpts = useMemo(
    () => ({
      url,
      clientId: "pwa-pos-print-prefs",
      appLabel: "KaiStore POS",
      userDisplayName: "Impresión",
    }),
    [url],
  );

  const refreshAliasesFromAgent = useCallback(async () => {
    setAliasesLoading(true);
    const c = new PrintServiceConnection({ ...connOpts });
    let reachedOpen = false;
    c.connect();
    try {
      await c.waitForOpen(20_000);
      reachedOpen = true;
      await new Promise((r) => globalThis.setTimeout(r, 400));
      const raw = (await c.getConfig()) as {
        aliasesByPurpose?: Record<string, unknown>;
      };
      const abp = raw?.aliasesByPurpose ?? {};
      setTicketAliases(stringList(abp.tickets));
      setDocumentAliases(stringList(abp.documents));
    } catch {
      setTicketAliases([]);
      setDocumentAliases([]);
    } finally {
      c.disconnect({ ifConnecting: reachedOpen ? "default" : "abandon" });
      setAliasesLoading(false);
    }
  }, [connOpts]);

  useEffect(() => {
    void refreshAliasesFromAgent();
  }, [refreshAliasesFromAgent]);

  const saveAll = useCallback(() => {
    writePrintServiceConfigToStorage({
      host,
      port: Number(port) || 14567,
      wssPort: Number(wssPort) || 14568,
      useTls,
    });
    writePosPurposePrinterAliasesToStorage({
      ticketsAlias,
      documentsAlias,
    });
    writePosDocumentPrintFormatsToStorage(docPrintFormats);
  }, [host, port, wssPort, useTls, ticketsAlias, documentsAlias, docPrintFormats]);

  const setDocFormat = useCallback((kind: PosDocumentPrintKind, format: PrintFormat) => {
    setDocPrintFormats((prev) => ({ ...prev, [kind]: format }));
  }, []);

  const runTestPrint = useCallback(
    async (kind: PosDocumentPrintKind) => {
      if (testPrintBusyKind) return;
      setTestPrintBusyKind(kind);
      try {
        await printPosDocumentTest(kind, docPrintFormats[kind]);
      } catch (e) {
        console.warn("[pos-print-test]", e);
        window.alert(
          e instanceof Error
            ? e.message
            : "No se pudo enviar la impresión de prueba. Revisá KaiPrinters o el diálogo del navegador.",
        );
      } finally {
        setTestPrintBusyKind(null);
      }
    },
    [docPrintFormats, testPrintBusyKind],
  );

  const ticketOptions = useMemo(
    () => aliasSelectOptions(ticketAliases, ticketsAlias),
    [ticketAliases, ticketsAlias],
  );
  const documentOptions = useMemo(
    () => aliasSelectOptions(documentAliases, documentsAlias),
    [documentAliases, documentsAlias],
  );

  return (
    <>
      <KaiPrintersDownloadSection />

      <form
        id={formId}
        className={`mt-6 space-y-6 ${className}`}
        onSubmit={(e) => {
          e.preventDefault();
          saveAll();
        }}
      >
        <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Conexión al agente</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField
              label="Host"
              name="print-host"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              alwaysShowLabel
              data-test-id="pos-print-prefs-host"
            />
            <TextField
              label="Puerto WS (sin TLS)"
              name="print-port"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              inputMode="numeric"
              alwaysShowLabel
              data-test-id="pos-print-prefs-port"
            />
            <TextField
              label="Puerto WSS"
              name="print-wss-port"
              value={wssPort}
              onChange={(e) => setWssPort(e.target.value)}
              inputMode="numeric"
              alwaysShowLabel
              data-test-id="pos-print-prefs-wss-port"
            />
            <div className="flex items-end pb-1 sm:col-span-2">
              <Switch
                checked={useTls}
                onChange={setUseTls}
                label="Usar WSS (HTTPS / certificado local)"
                labelPosition="right"
                data-test-id="pos-print-prefs-use-tls"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Impresoras por tipo</h2>
            <Button
              type="button"
              variant="outlined"
              size="sm"
              disabled={aliasesLoading}
              loading={aliasesLoading}
              onClick={() => void refreshAliasesFromAgent()}
              data-test-id="pos-print-prefs-refresh-aliases"
            >
              Actualizar desde el agente
            </Button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Select
              label="Tickets"
              options={ticketOptions}
              value={ticketsAlias || null}
              onChange={(id) => setTicketsAlias(id == null ? "" : String(id))}
              allowClear
              alwaysShowLabel
              data-test-id="pos-print-prefs-tickets-alias"
            />
            <Select
              label="Documentos"
              options={documentOptions}
              value={documentsAlias || null}
              onChange={(id) => setDocumentsAlias(id == null ? "" : String(id))}
              allowClear
              alwaysShowLabel
              data-test-id="pos-print-prefs-documents-alias"
            />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Impresión según documento</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Formato por defecto al imprimir desde el POS (ventas, cotizaciones, cierre de caja, planilla de conteo, etc.).
            En cotizaciones, el diálogo de emisión precargará esta opción (puedes cambiarla antes de imprimir).
            Usá el icono de impresión para enviar un documento de prueba con datos ficticios a KaiPrinters; si el
            agente no está disponible, se abrirá el diálogo de impresión del navegador.
          </p>
          <div className="mt-4 grid gap-4">
            {(
              [
                ["sale", "Ventas", "pos-print-prefs-sale-mode"] as const,
                ["quotation", "Cotizaciones", "pos-print-prefs-quotation-mode"] as const,
                ["backorder", "Encargos", "pos-print-prefs-backorder-mode"] as const,
                [
                  "customerCreditNote",
                  "Notas de crédito",
                  "pos-print-prefs-customer-credit-note-mode",
                ] as const,
                ["cashClosing", "Arqueo de caja", "pos-print-prefs-cash-closing-mode"] as const,
                [
                  "cashCountSheet",
                  "Planilla de conteo",
                  "pos-print-prefs-cash-count-sheet-mode",
                ] as const,
                [
                  "cashSessionOpening",
                  "Apertura de caja",
                  "pos-print-prefs-cash-session-opening-mode",
                ] as const,
              ] as const
            ).map(([kind, label, testId]) => (
              <div key={kind} className="flex items-start gap-2">
                <DocumentPrintTestButton
                  busy={testPrintBusyKind === kind}
                  disabled={!storageHydrated || testPrintBusyKind !== null}
                  data-test-id={`${testId}-test-print`}
                  onPrint={() => runTestPrint(kind)}
                />
                <div className="min-w-0 flex-1">
                  <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
                  {storageHydrated ? (
                    <PrintFormatSelector
                      value={docPrintFormats[kind]}
                      onChange={(format) => setDocFormat(kind, format)}
                      data-test-id={testId}
                    />
                  ) : (
                    <div
                      className="h-[52px] rounded-lg border border-border bg-muted/20"
                      aria-hidden
                      data-test-id={`${testId}-skeleton`}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </form>

      <PosCustomerDisplaySettingsSection className="mt-6" />

      <div className="mt-8 flex w-full justify-end pb-16">
        <Button type="submit" form={formId} variant="primary" data-test-id="pos-print-prefs-save">
          Guardar configuración
        </Button>
      </div>
    </>
  );
}
