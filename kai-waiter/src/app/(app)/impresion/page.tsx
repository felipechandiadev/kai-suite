"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  KitchenUnitPrintBindingsSection,
  migrateKitchenBindingsFromServer,
  PrintAgentPicker,
  fetchAliasesByPurposeFromConnection,
  readPrintServiceConfigFromStorage,
  readWaiterKitchenUnitPrintBindings,
  readWaiterTicketsPrinterAlias,
  resetSharedPrintServiceConnections,
  writePrintServiceConfigToStorage,
  writeWaiterKitchenUnitPrintBindings,
  writeWaiterTicketsPrinterAlias,
  type KitchenFulfillmentModeClient,
  type KitchenUnitPrintBindingsMap,
  type PrintAgentCatalogItem,
} from "@kai/print-service-client";
import { Button, IconButton, TextField, Switch } from "@kai/ui";
import { loadWaiterSession } from "@/lib/app-session";
import { listPrintAgentsForWaiterAction } from "@/features/print-agents/actions/print-agents.action";
import { listKitchenProductionUnitsAction } from "@/features/dining-waiter/actions/waiter.action";

export default function WaiterLocalPrintingPage() {
  const router = useRouter();
  const [session, setSession] = useState(() =>
    typeof window !== "undefined" ? loadWaiterSession() : null,
  );
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState("14567");
  const [wssPort, setWssPort] = useState("14568");
  const [useTls, setUseTls] = useState(false);
  const [agents, setAgents] = useState<PrintAgentCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [aliasesLoading, setAliasesLoading] = useState(false);
  const [aliasesError, setAliasesError] = useState<string | null>(null);
  const [aliasesRefreshNonce, setAliasesRefreshNonce] = useState(0);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [kitchenUnits, setKitchenUnits] = useState<
    Array<{
      id: string;
      name: string;
      kitchenFulfillmentMode: KitchenFulfillmentModeClient;
      kitchenPrintSettings?: {
        printAgentId?: string | null;
        printerDisplayLabel?: string | null;
      } | null;
    }>
  >([]);
  const [kitchenBindings, setKitchenBindings] = useState<KitchenUnitPrintBindingsMap>(
    () => readWaiterKitchenUnitPrintBindings(),
  );
  const [comandasAliases, setComandasAliases] = useState<string[]>([]);
  const [ticketsAliases, setTicketsAliases] = useState<string[]>([]);
  const [ticketsAlias, setTicketsAlias] = useState(
    () => (typeof window !== "undefined" ? readWaiterTicketsPrinterAlias() : ""),
  );

  useEffect(() => {
    const s = loadWaiterSession();
    setSession(s);
    if (!s) {
      router.replace("/login");
      return;
    }
    const c = readPrintServiceConfigFromStorage();
    setHost(c.host);
    setPort(String(c.port));
    setWssPort(String(c.wssPort));
    setUseTls(c.useTls);
  }, [router]);

  const refreshAliasesFromAgent = useCallback(async () => {
    setAliasesLoading(true);
    setAliasesError(null);
    try {
      const aliases = await fetchAliasesByPurposeFromConnection({
        host,
        port,
        wssPort,
        useTls,
        clientId: "kai-waiter-print-prefs",
        appLabel: "Kai Waiter",
      });
      setComandasAliases(aliases.comandas);
      setTicketsAliases(aliases.tickets);
      setAliasesRefreshNonce((n) => n + 1);
    } catch (e) {
      setComandasAliases([]);
      setTicketsAliases([]);
      setAliasesError(e instanceof Error ? e.message : String(e));
    } finally {
      setAliasesLoading(false);
    }
  }, [host, port, wssPort, useTls]);

  const refresh = useCallback(async () => {
    const s = loadWaiterSession();
    if (!s) return;
    setLoading(true);
    try {
      const [rows, units] = await Promise.all([
        listPrintAgentsForWaiterAction({
          userId: s.userId,
          companyId: s.companyId,
        }),
        listKitchenProductionUnitsAction({
          userId: s.userId,
          companyId: s.companyId,
        }),
      ]);
      setAgents(
        rows.map((a) => ({
          id: a.id,
          displayName: a.displayName,
          lanHost: a.lanHost,
          wsPort: a.wsPort,
          wssPort: a.wssPort,
          useTls: a.useTls,
          online: a.online,
          platform: a.platform,
          companyName: a.companyName ?? null,
        })),
      );
      const mapped = units.map((u) => ({
        id: u.id,
        name: u.name,
        kitchenFulfillmentMode: u.kitchenFulfillmentMode,
        kitchenPrintSettings: u.kitchenPrintSettings,
      }));
      setKitchenUnits(mapped);
      setKitchenBindings(
        migrateKitchenBindingsFromServer(
          "waiter",
          mapped.map((u) => ({
            id: u.id,
            name: u.name,
            kitchenFulfillmentMode: u.kitchenFulfillmentMode,
            kitchenPrintSettings: u.kitchenPrintSettings,
          })),
        ),
      );
    } catch {
      setAgents([]);
      setKitchenUnits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) void refresh();
  }, [session, refresh]);

  useEffect(() => {
    if (session) void refreshAliasesFromAgent();
  }, [session, refreshAliasesFromAgent]);

  const saveKitchenConfig = useCallback(() => {
    writeWaiterKitchenUnitPrintBindings(kitchenBindings);
    setSavedMsg("Configuración de comandas guardada");
  }, [kitchenBindings]);

  if (!session) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <IconButton
          type="button"
          icon="ArrowLeft"
          variant="action"
          size="sm"
          onClick={() => router.push("/salon")}
          ariaLabel="Volver al salón"
        />
        <h1 className="text-lg font-semibold text-foreground">Impresión local</h1>
      </div>
      <PrintAgentPicker
        agents={agents}
        loading={loading}
        onRefresh={() => {
          void refresh();
          void refreshAliasesFromAgent();
        }}
        onApplied={(agent) => {
          setHost(agent.lanHost ?? host);
          setPort(String(agent.wsPort ?? 14567));
          setWssPort(String(agent.wssPort ?? 14568));
          setUseTls(Boolean(agent.useTls));
          setSavedMsg(`Conectado a ${agent.displayName}`);
        }}
      />
      <details className="rounded-xl border border-border p-3">
        <summary className="cursor-pointer text-sm font-medium">Manual (avanzado)</summary>
        <div className="mt-3 space-y-3">
          <TextField
            label="Host"
            name="host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            alwaysShowLabel
          />
          <TextField
            label="Puerto WS"
            name="port"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            alwaysShowLabel
          />
          <TextField
            label="Puerto WSS"
            name="wss"
            value={wssPort}
            onChange={(e) => setWssPort(e.target.value)}
            alwaysShowLabel
          />
          <Switch
            checked={useTls}
            onChange={setUseTls}
            label="Usar WSS"
            labelPosition="right"
          />
          <Button
            type="button"
            onClick={() => {
              writePrintServiceConfigToStorage({
                host: host.trim() || "127.0.0.1",
                port: Number(port) || 14567,
                wssPort: Number(wssPort) || 14568,
                useTls,
                agentId: null,
                agentName: null,
              });
              resetSharedPrintServiceConnections();
              setSavedMsg("Configuración manual guardada");
              void refreshAliasesFromAgent();
            }}
          >
            Guardar manual
          </Button>
        </div>
      </details>

      <section className="rounded-xl border border-border p-3">
        <h2 className="text-sm font-semibold text-foreground">Cuenta (ticket)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pedir cuenta e imprimir usa el agente elegido arriba y esta impresora de
          tickets.
        </p>
        <label className="mt-3 flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Impresora de cuenta (alias)</span>
          <select
            className="rounded-md border border-border bg-background px-2 py-1.5"
            value={ticketsAlias}
            disabled={aliasesLoading}
            onChange={(e) => {
              const next = e.target.value;
              setTicketsAlias(next);
              writeWaiterTicketsPrinterAlias(next);
              setSavedMsg("Impresora de cuenta guardada");
            }}
            data-test-id="waiter-tickets-alias"
          >
            <option value="">Predeterminada del agente</option>
            {ticketsAlias && !ticketsAliases.includes(ticketsAlias) ? (
              <option value={ticketsAlias}>{ticketsAlias}</option>
            ) : null}
            {ticketsAliases.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="rounded-xl border border-border p-3">
        <KitchenUnitPrintBindingsSection
          units={kitchenUnits}
          bindings={kitchenBindings}
          onBindingsChange={setKitchenBindings}
          agents={agents}
          catalogLoading={loading || aliasesLoading}
          onRefreshCatalog={() => {
            void refresh();
            void refreshAliasesFromAgent();
          }}
          comandasAliases={comandasAliases}
          aliasesRefreshNonce={aliasesRefreshNonce}
          idPrefix="waiter-kitchen"
          testPrintSourceApp="kai-waiter"
          testPrintCompanyName={agents.find((a) => a.companyName)?.companyName}
        />
        <Button
          type="button"
          className="mt-3"
          size="sm"
          onClick={saveKitchenConfig}
          data-test-id="waiter-kitchen-comanda-save"
        >
          Guardar comandas
        </Button>
      </section>

      {aliasesError ? (
        <p className="text-xs text-destructive">{aliasesError}</p>
      ) : null}
      {savedMsg ? <p className="text-xs text-muted-foreground">{savedMsg}</p> : null}
    </div>
  );
}
