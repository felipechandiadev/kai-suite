"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  KitchenUnitPrintBindingsSection,
  migrateKitchenBindingsFromServer,
  PrintAgentPicker,
  fetchAliasesByPurposeFromConnection,
  readPrintServiceConfigFromStorage,
  readWaiterKitchenComandaReplicaPrefs,
  readWaiterKitchenUnitPrintBindings,
  writePrintServiceConfigToStorage,
  writeWaiterKitchenComandaReplicaPrefs,
  writeWaiterKitchenUnitPrintBindings,
  type KitchenFulfillmentModeClient,
  type KitchenUnitPrintBindingsMap,
  type PrintAgentCatalogItem,
} from "@kai/print-service-client";
import { Button, TextField, Switch } from "@kai/ui";
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
  const [kitchenReplicaEnabled, setKitchenReplicaEnabled] = useState(false);
  const [kitchenReplicaUnitIds, setKitchenReplicaUnitIds] = useState<string[]>(
    [],
  );
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
    const prefs = readWaiterKitchenComandaReplicaPrefs();
    setKitchenReplicaEnabled(prefs.enabled);
    setKitchenReplicaUnitIds(prefs.productionUnitIds);
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
      setAliasesRefreshNonce((n) => n + 1);
    } catch (e) {
      setComandasAliases([]);
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
    writeWaiterKitchenComandaReplicaPrefs({
      enabled: kitchenReplicaEnabled,
      productionUnitIds: kitchenReplicaUnitIds,
    });
    writeWaiterKitchenUnitPrintBindings(kitchenBindings);
    setSavedMsg("Configuración de comandas guardada");
  }, [kitchenBindings, kitchenReplicaEnabled, kitchenReplicaUnitIds]);

  if (!session) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-foreground">Impresión local</h1>
        <Button type="button" variant="outlined" size="sm" onClick={() => router.push("/salon")}>
          Volver
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Elegí el agente Kai Printers de esta empresa. La impresión usa la IP de red local del
        equipo. Puede pedirse permiso de acceso a la red local en el navegador.
      </p>
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
              setSavedMsg("Configuración manual guardada");
              void refreshAliasesFromAgent();
            }}
          >
            Guardar manual
          </Button>
        </div>
      </details>

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
          replicaEnabled={kitchenReplicaEnabled}
          onReplicaEnabledChange={setKitchenReplicaEnabled}
          replicaUnitIds={kitchenReplicaUnitIds}
          onReplicaUnitIdsChange={setKitchenReplicaUnitIds}
          idPrefix="waiter-kitchen"
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
