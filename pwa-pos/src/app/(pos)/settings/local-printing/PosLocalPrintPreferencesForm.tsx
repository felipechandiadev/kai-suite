"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  PrintServiceConnection,
  buildWebSocketUrl,
  printModesForPosDocumentKind,
  printServicePageRequiresTls,
  readPrintServiceConfigFromStorage,
  readPosDocumentPrintModesFromStorage,
  readPosPurposePrinterAliasesFromStorage,
  sanitizePosDocumentPrintMode,
  type KaiPrintersDownloadsManifests,
  type PosDocumentPrintKind,
  type PosDocumentPrintMode,
  PosDocumentPrintModeSelector,
  writePosDocumentPrintModesToStorage,
  writePosPurposePrinterAliasesToStorage,
  writePrintServiceConfigToStorage,
  KaiPrintersDownloadSection,
} from "@kai/print-service-client";
import { Button, Select, Switch, TextField } from "@/shared/admin-shared";
import { printPosDocumentTest } from "@/features/pos-print/lib/print-pos-document-test";
import { printPosQuickTicketTest } from "@/features/pos-print/lib/print-pos-quick-print-test";
import { getFiscalBoletaTestPreviewAction } from "@/features/fiscal/actions/fiscal-boleta-test-preview.action";
import { printFiscalBoletaPreview } from "@/features/fiscal/print/fiscal-boleta-preview-print";
import { DocumentPrintTestButton } from "@/features/pos-print/ui/DocumentPrintTestButton";
import { getQuotationsEnabledAction } from "@/features/company/actions/company-quotations.action";
import { getPresalesEnabledAction } from "@/features/presale-tickets/actions/presales-enabled.action";

type Props = {
  className?: string;
  initialManifests?: KaiPrintersDownloadsManifests;
};

function stringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim());
}

const INITIAL_DOC_PRINT_MODES: Record<PosDocumentPrintKind, PosDocumentPrintMode> = {
  sale: "ticket",
  quotation: "ticket",
  backorder: "ticket",
  presale: "ticket",
  customerCreditNote: "ticket",
  cashClosing: "ticket",
  cashCountSheet: "document",
  cashSessionOpening: "ticket",
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

export function PosLocalPrintPreferencesForm({
  className = "",
  initialManifests,
}: Props) {
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
  const [docPrintModes, setDocPrintModes] =
    useState<Record<PosDocumentPrintKind, PosDocumentPrintMode>>(INITIAL_DOC_PRINT_MODES);
  const [storageHydrated, setStorageHydrated] = useState(false);
  const [testPrintBusyKind, setTestPrintBusyKind] = useState<PosDocumentPrintKind | null>(null);
  const [quickTestBusy, setQuickTestBusy] = useState(false);
  const [saleDemoTestBusy, setSaleDemoTestBusy] = useState(false);
  const [fiscalBoletaTestBusy, setFiscalBoletaTestBusy] = useState(false);
  const [quickTestMessage, setQuickTestMessage] = useState<string | null>(null);
  const [quotationsEnabled, setQuotationsEnabled] = useState(false);
  const [presalesEnabled, setPresalesEnabled] = useState(false);

  useEffect(() => {
    void getQuotationsEnabledAction().then(setQuotationsEnabled);
    void getPresalesEnabledAction().then(setPresalesEnabled);
  }, []);

  useEffect(() => {
    const c = readPrintServiceConfigFromStorage();
    setHost(c.host);
    setPort(String(c.port));
    setWssPort(String(c.wssPort));
    setUseTls(c.useTls);
    const aliases = readPosPurposePrinterAliasesFromStorage();
    setTicketsAlias(aliases.ticketsAlias);
    setDocumentsAlias(aliases.documentsAlias);
    const stored = readPosDocumentPrintModesFromStorage();
    const sanitized = { ...INITIAL_DOC_PRINT_MODES, ...stored };
    for (const kind of Object.keys(sanitized) as PosDocumentPrintKind[]) {
      sanitized[kind] = sanitizePosDocumentPrintMode(kind, sanitized[kind]);
    }
    setDocPrintModes(sanitized);
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
    writePosDocumentPrintModesToStorage(docPrintModes);
  }, [host, port, wssPort, useTls, ticketsAlias, documentsAlias, docPrintModes]);

  const setDocMode = useCallback((kind: PosDocumentPrintKind, mode: PosDocumentPrintMode) => {
    setDocPrintModes((prev) => ({ ...prev, [kind]: mode }));
  }, []);

  const runQuickTicketTest = useCallback(async () => {
    if (quickTestBusy || testPrintBusyKind) return;
    setQuickTestBusy(true);
    setQuickTestMessage(null);
    try {
      const result = await printPosQuickTicketTest({
        host: host.trim() || "127.0.0.1",
        port: Number(port) || 14567,
        wssPort: Number(wssPort) || 14568,
        useTls,
        ticketsAlias,
        saleMode: docPrintModes.sale,
      });
      setQuickTestMessage(result.detail);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "No se pudo enviar la impresión de prueba. Revisá Kai Printers y el alias de Tickets.";
      setQuickTestMessage(msg);
      window.alert(msg);
    } finally {
      setQuickTestBusy(false);
    }
  }, [
    quickTestBusy,
    testPrintBusyKind,
    host,
    port,
    wssPort,
    useTls,
    ticketsAlias,
    docPrintModes.sale,
  ]);

  const runSaleDemoTest = useCallback(async () => {
    if (saleDemoTestBusy || quickTestBusy || testPrintBusyKind) return;
    setSaleDemoTestBusy(true);
    setQuickTestMessage(null);
    try {
      writePrintServiceConfigToStorage({
        host: host.trim() || "127.0.0.1",
        port: Number(port) || 14567,
        wssPort: Number(wssPort) || 14568,
        useTls,
      });
      writePosPurposePrinterAliasesToStorage({
        ticketsAlias,
        documentsAlias,
      });
      const channel = await printPosDocumentTest("sale", docPrintModes.sale);
      setQuickTestMessage(
        channel === "agent"
          ? "Venta demo encolada (mismo flujo que una venta real). Revise la impresora."
          : "No se encoló en el agente; se abrió el diálogo del navegador.",
      );
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "No se pudo enviar la venta demo al agente.";
      setQuickTestMessage(msg);
      window.alert(msg);
    } finally {
      setSaleDemoTestBusy(false);
    }
  }, [
    saleDemoTestBusy,
    quickTestBusy,
    testPrintBusyKind,
    host,
    port,
    wssPort,
    useTls,
    ticketsAlias,
    documentsAlias,
    docPrintModes.sale,
  ]);

  const runFiscalBoletaTest = useCallback(async () => {
    if (fiscalBoletaTestBusy || quickTestBusy || saleDemoTestBusy || testPrintBusyKind) return;
    setFiscalBoletaTestBusy(true);
    setQuickTestMessage(null);
    try {
      writePrintServiceConfigToStorage({
        host: host.trim() || "127.0.0.1",
        port: Number(port) || 14567,
        wssPort: Number(wssPort) || 14568,
        useTls,
      });
      writePosPurposePrinterAliasesToStorage({
        ticketsAlias,
        documentsAlias,
      });
      const previewRes = await getFiscalBoletaTestPreviewAction("CASO-1");
      if (!previewRes.success) {
        throw new Error(previewRes.message);
      }
      const channel = await printFiscalBoletaPreview(previewRes.preview);
      setQuickTestMessage(
        channel === "agent"
          ? "Boleta SII de prueba encolada (`fiscal-boleta-preview`). Revise la impresora."
          : "No se encoló en el agente; se abrió el diálogo del navegador.",
      );
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "No se pudo enviar la boleta SII de prueba al agente.";
      setQuickTestMessage(msg);
      window.alert(msg);
    } finally {
      setFiscalBoletaTestBusy(false);
    }
  }, [
    fiscalBoletaTestBusy,
    quickTestBusy,
    saleDemoTestBusy,
    testPrintBusyKind,
    host,
    port,
    wssPort,
    useTls,
    ticketsAlias,
    documentsAlias,
  ]);

  const runTestPrint = useCallback(
    async (kind: PosDocumentPrintKind) => {
      if (testPrintBusyKind) return;
      setTestPrintBusyKind(kind);
      try {
        await printPosDocumentTest(kind, docPrintModes[kind]);
      } catch (e) {
        console.warn("[pos-print-test]", e);
        window.alert(
          e instanceof Error
            ? e.message
            : "No se pudo enviar la impresión de prueba. Revisá Kai Printers o el diálogo del navegador.",
        );
      } finally {
        setTestPrintBusyKind(null);
      }
    },
    [docPrintModes, testPrintBusyKind],
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
      <KaiPrintersDownloadSection initialManifests={initialManifests} />

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
          <p className="mt-2 text-sm text-muted-foreground">
            El agente puede estar en cualquier equipo de la red local.{" "}
            <code className="text-foreground">127.0.0.1</code> significa{" "}
            <strong className="font-medium text-foreground">este mismo dispositivo</strong> donde corre el
            navegador del POS (aunque lo abras por IP, p. ej. en una tablet Swan). Si Kai Printers está en
            otro equipo, usá su <strong className="font-medium text-foreground">IP LAN</strong> (la ves en
            Kai Printers → Conectar con el POS).
          </p>
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
          <p className="mt-3 text-sm text-muted-foreground">
            URL de conexión: <code className="text-foreground">{url}</code>
          </p>
          {useTls && !printServicePageRequiresTls() ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Con WSS activo, abrí una vez{" "}
              <code className="text-foreground">
                https://{(host || "127.0.0.1").trim()}:{wssPort || "14568"}/
              </code>{" "}
              en este navegador y aceptá el certificado antes de imprimir.
            </p>
          ) : null}
        </section>

        <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Impresoras</h2>
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
          <p className="mt-1 text-sm text-muted-foreground">
            Elegí qué impresora usa el POS para tickets y para documentos. El ancho del rollo o el
            tamaño de hoja se define en cada línea de Kai Printers, no aquí.
          </p>
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
          <h2 className="text-sm font-semibold text-foreground">Probar impresora</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <strong>Ticket de prueba</strong> usa el agente directo (rápido).{" "}
            <strong>Venta demo</strong> usa el mismo encolado que una venta real (`pos-sale-ticket`).{" "}
            <strong>Boleta SII</strong> usa el mismo tipo que tras una venta (`fiscal-boleta-preview`).
            En Bluetooth espere 1–2 segundos entre pruebas.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="primary"
              disabled={
                !storageHydrated ||
                quickTestBusy ||
                saleDemoTestBusy ||
                fiscalBoletaTestBusy ||
                testPrintBusyKind !== null
              }
              loading={quickTestBusy}
              onClick={() => void runQuickTicketTest()}
              data-test-id="pos-print-prefs-quick-test"
            >
              Ticket de prueba (agente)
            </Button>
            <Button
              type="button"
              variant="outlined"
              disabled={
                !storageHydrated ||
                quickTestBusy ||
                saleDemoTestBusy ||
                fiscalBoletaTestBusy ||
                testPrintBusyKind !== null
              }
              loading={saleDemoTestBusy}
              onClick={() => void runSaleDemoTest()}
              data-test-id="pos-print-prefs-sale-demo-test"
            >
              Venta demo (como venta real)
            </Button>
            <Button
              type="button"
              variant="outlined"
              disabled={
                !storageHydrated ||
                quickTestBusy ||
                saleDemoTestBusy ||
                fiscalBoletaTestBusy ||
                testPrintBusyKind !== null
              }
              loading={fiscalBoletaTestBusy}
              onClick={() => void runFiscalBoletaTest()}
              data-test-id="pos-print-prefs-fiscal-boleta-test"
            >
              Boleta SII (como venta real)
            </Button>
          </div>
          {quickTestMessage ? (
            <p className="mt-2 text-sm text-muted-foreground" data-test-id="pos-print-prefs-quick-test-message">
              {quickTestMessage}
            </p>
          ) : null}
        </section>

        <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Impresión según documento</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Por cada tipo de documento elegí si se imprime como ticket o como documento. La impresora
            concreta es la definida arriba (Tickets o Documentos). En cotizaciones, el diálogo de
            emisión precargará esta opción.
          </p>
          <div className="mt-4 grid gap-4">
            {(
              [
                ["sale", "Ventas", "pos-print-prefs-sale-mode"] as const,
                ...(quotationsEnabled
                  ? ([["quotation", "Cotizaciones", "pos-print-prefs-quotation-mode"]] as const)
                  : []),
                ...(presalesEnabled
                  ? ([["presale", "Tickets preventa", "pos-print-prefs-presale-mode"]] as const)
                  : []),
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
                    <PosDocumentPrintModeSelector
                      value={docPrintModes[kind]}
                      onChange={(mode) => setDocMode(kind, mode)}
                      allowedModes={printModesForPosDocumentKind(kind)}
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

      <div className="mt-8 flex w-full justify-end pb-16">
        <Button type="submit" form={formId} variant="primary" data-test-id="pos-print-prefs-save">
          Guardar configuración
        </Button>
      </div>
    </>
  );
}
