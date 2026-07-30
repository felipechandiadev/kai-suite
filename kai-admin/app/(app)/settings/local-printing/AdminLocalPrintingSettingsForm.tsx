"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  PrintServiceConnection,
  resolvePrintAgentConnectionUrls,
  readAdminDocumentPrintFormatsFromStorage,
  readAdminPurposePrinterAliasFromStorage,
  readPrintServiceConfigFromStorage,
  type AdminDocumentPrintKind,
  type PrintFormat,
  PrintFormatSelector,
  writeAdminDocumentPrintFormatsToStorage,
  writeAdminPurposePrinterAliasToStorage,
  writePrintServiceConfigToStorage,
  KaiPrintersDownloadSection,
  type KaiPrintersDownloadsManifests,
  PrintServiceAgentConnectionHints,
  PrintAgentPicker,
  type PrintAgentCatalogItem,
} from "@kai/print-service-client";
import { Button } from "@kai/ui";
import { Select } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Switch } from "@kai/ui";
import {
  createPrintAgentAction,
  listPrintAgentsAction,
  revokePrintAgentAction,
} from "@/features/print-agents/actions/print-agents.action";
import type { PrintAgentDto } from "@/features/print-agents/types/print-agent.types";

type Props = {
  className?: string;
  initialManifests?: KaiPrintersDownloadsManifests;
};

function stringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((s) => s.trim());
}

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

const INITIAL_DOC_PRINT_FORMATS: Record<AdminDocumentPrintKind, PrintFormat> = {
  sale: "document_a4",
  backorder: "ticket_80mm",
};

export function AdminLocalPrintingSettingsForm({
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
  const [docPrintFormats, setDocPrintFormats] =
    useState<Record<AdminDocumentPrintKind, PrintFormat>>(INITIAL_DOC_PRINT_FORMATS);
  const [storageHydrated, setStorageHydrated] = useState(false);
  const [catalogAgents, setCatalogAgents] = useState<PrintAgentCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [lastPairingToken, setLastPairingToken] = useState<string | null>(null);
  const [catalogMsg, setCatalogMsg] = useState<string | null>(null);

  const refreshCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogMsg(null);
    try {
      const rows = await listPrintAgentsAction();
      setCatalogAgents(
        rows.map((a: PrintAgentDto) => ({
          id: a.id,
          displayName: a.displayName,
          lanHost: a.lanHost,
          wsPort: a.wsPort,
          wssPort: a.wssPort,
          useTls: a.useTls,
          online: a.online,
          platform: a.platform,
        })),
      );
    } catch (e) {
      setCatalogMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    const c = readPrintServiceConfigFromStorage();
    setHost(c.host);
    setPort(String(c.port));
    setWssPort(String(c.wssPort));
    setUseTls(c.useTls);
    const a = readAdminPurposePrinterAliasFromStorage();
    setTicketsAlias(a.ticketsAlias);
    setDocumentsAlias(a.documentsAlias);
    setDocPrintFormats(readAdminDocumentPrintFormatsFromStorage());
    setStorageHydrated(true);
    void refreshCatalog();
  }, [refreshCatalog]);

  const { wsUrl: url } = useMemo(
    () =>
      resolvePrintAgentConnectionUrls({
        host,
        port,
        wssPort,
        useTls,
      }),
    [host, port, wssPort, useTls],
  );

  const connOpts = useMemo(
    () => ({
      url,
      clientId: "kai-admin-print-prefs",
      appLabel: "KaiStore Administración",
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
    if (!storageHydrated) return;
    void refreshAliasesFromAgent();
  }, [storageHydrated, refreshAliasesFromAgent]);

  const ticketOptions = useMemo(
    () => aliasSelectOptions(ticketAliases, ticketsAlias),
    [ticketAliases, ticketsAlias],
  );
  const documentOptions = useMemo(
    () => aliasSelectOptions(documentAliases, documentsAlias),
    [documentAliases, documentsAlias],
  );

  const saveLocal = useCallback(() => {
    writePrintServiceConfigToStorage({
      host,
      port: Number(port) || 14567,
      wssPort: Number(wssPort) || 14568,
      useTls,
    });
    writeAdminPurposePrinterAliasToStorage({ ticketsAlias, documentsAlias });
    writeAdminDocumentPrintFormatsToStorage(docPrintFormats);
  }, [host, port, useTls, wssPort, ticketsAlias, documentsAlias, docPrintFormats]);

  const setDocFormat = useCallback((kind: AdminDocumentPrintKind, format: PrintFormat) => {
    setDocPrintFormats((prev) => ({ ...prev, [kind]: format }));
  }, []);

  return (
    <>
      <KaiPrintersDownloadSection initialManifests={initialManifests} />

      <form
        id={formId}
        className={`mt-6 space-y-6 ${className}`}
        onSubmit={(e) => {
          e.preventDefault();
          saveLocal();
        }}
      >
        <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Conexión al agente</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Elegí un agente emparejado con Kai Core (recomendado) o configurá host/puerto a mano.
          </p>
          <div className="mt-4 space-y-4">
            <PrintAgentPicker
              agents={catalogAgents}
              loading={catalogLoading}
              onRefresh={() => void refreshCatalog()}
              onApplied={(agent) => {
                setHost(agent.lanHost ?? host);
                setPort(String(agent.wsPort ?? 14567));
                setWssPort(String(agent.wssPort ?? 14568));
                setUseTls(Boolean(agent.useTls));
              }}
              data-test-id="admin-print-agent-picker"
            />
            <div className="rounded-md border border-dashed border-border p-3">
              <p className="text-xs font-semibold text-foreground">Registrar agente</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <TextField
                  label="Nombre"
                  name="new-print-agent-name"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  alwaysShowLabel
                  className="min-w-[12rem] flex-1"
                />
                <Button
                  type="button"
                  variant="outlined"
                  size="sm"
                  className="self-end"
                  onClick={() => {
                    void (async () => {
                      setCatalogMsg(null);
                      setLastPairingToken(null);
                      try {
                        const created = await createPrintAgentAction({
                          displayName: newAgentName.trim(),
                        });
                        setLastPairingToken(created.pairingToken);
                        setNewAgentName("");
                        setCatalogMsg(
                          "Copiá el token en Kai Printers (desktop/Android) para emparejar.",
                        );
                        await refreshCatalog();
                      } catch (e) {
                        setCatalogMsg(e instanceof Error ? e.message : String(e));
                      }
                    })();
                  }}
                >
                  Crear y generar token
                </Button>
              </div>
              {lastPairingToken ? (
                <p className="mt-2 break-all rounded bg-muted/40 p-2 font-mono text-[11px] text-foreground">
                  {lastPairingToken}
                </p>
              ) : null}
              {catalogAgents.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {catalogAgents.map((a) => (
                    <li key={a.id} className="flex justify-between gap-2">
                      <span>{a.displayName}</span>
                      <button
                        type="button"
                        className="underline"
                        onClick={() => {
                          void (async () => {
                            await revokePrintAgentAction(a.id);
                            await refreshCatalog();
                          })();
                        }}
                      >
                        Revocar
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {catalogMsg ? (
                <p className="mt-2 text-xs text-muted-foreground">{catalogMsg}</p>
              ) : null}
            </div>
          </div>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Configuración manual (avanzado)
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <TextField
                label="Host"
                name="print-host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                alwaysShowLabel
                data-test-id="admin-print-prefs-host"
              />
              <TextField
                label="Puerto WS (sin TLS)"
                name="print-port"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                alwaysShowLabel
                data-test-id="admin-print-prefs-port"
              />
              <TextField
                label="Puerto WSS"
                name="print-wss-port"
                value={wssPort}
                onChange={(e) => setWssPort(e.target.value)}
                alwaysShowLabel
                data-test-id="admin-print-prefs-wss-port"
              />
              <div className="flex items-end pb-1 sm:col-span-2">
                <Switch
                  checked={useTls}
                  onChange={setUseTls}
                  label="Usar WSS (HTTPS / certificado local)"
                  labelPosition="right"
                  data-test-id="admin-print-prefs-use-tls"
                />
              </div>
            </div>
            <div className="mt-3">
              <PrintServiceAgentConnectionHints
                host={host}
                port={port}
                wssPort={wssPort}
                useTls={useTls}
                data-test-id="admin-print-prefs-connection-hints"
              />
            </div>
          </details>
        </section>

        <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Impresoras por tipo</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Elija el alias configurado en KaiPrinters para tickets térmicos y documentos en hoja.
              </p>
            </div>
            <Button
              type="button"
              variant="outlined"
              size="sm"
              disabled={aliasesLoading}
              loading={aliasesLoading}
              onClick={() => void refreshAliasesFromAgent()}
              data-test-id="admin-print-prefs-refresh-aliases"
            >
              Actualizar desde el agente
            </Button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {storageHydrated ? (
              <>
                <Select
                  label="Tickets"
                  options={ticketOptions}
                  value={ticketsAlias || null}
                  onChange={(id) => setTicketsAlias(id == null ? "" : String(id))}
                  allowClear
                  alwaysShowLabel
                  data-test-id="admin-print-prefs-tickets-alias"
                />
                <Select
                  label="Documentos"
                  options={documentOptions}
                  value={documentsAlias || null}
                  onChange={(id) => setDocumentsAlias(id == null ? "" : String(id))}
                  allowClear
                  alwaysShowLabel
                  data-test-id="admin-print-prefs-documents-alias"
                />
              </>
            ) : (
              <>
                <div
                  className="h-14 rounded-lg border border-border bg-muted/20"
                  aria-hidden
                  data-test-id="admin-print-prefs-tickets-alias-skeleton"
                />
                <div
                  className="h-14 rounded-lg border border-border bg-muted/20"
                  aria-hidden
                  data-test-id="admin-print-prefs-documents-alias-skeleton"
                />
              </>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Impresión según documento</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Formato por defecto al imprimir desde administración (ventas y encargos).
          </p>
          <div className="mt-4 grid gap-4">
            {(
              [
                ["sale", "Ventas", "admin-print-prefs-sale-mode"] as const,
                ["backorder", "Encargos", "admin-print-prefs-backorder-mode"] as const,
              ] as const
            ).map(([kind, label, testId]) => (
              <div key={kind}>
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
            ))}
          </div>
        </section>
      </form>

      <div className="mt-8 flex w-full justify-end pb-16">
        <Button type="submit" form={formId} variant="primary" data-test-id="admin-print-prefs-save">
          Guardar configuración
        </Button>
      </div>
    </>
  );
}
