"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PrintAgentPicker,
  readPrintServiceConfigFromStorage,
  readWaiterKitchenComandaReplicaPrefs,
  writePrintServiceConfigToStorage,
  writeWaiterKitchenComandaReplicaPrefs,
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
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [kitchenReplicaEnabled, setKitchenReplicaEnabled] = useState(false);
  const [kitchenReplicaUnitIds, setKitchenReplicaUnitIds] = useState<string[]>(
    [],
  );
  const [kitchenUnits, setKitchenUnits] = useState<
    Array<{ id: string; name: string }>
  >([]);

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
        })),
      );
      setKitchenUnits(units.map((u) => ({ id: u.id, name: u.name })));
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

  if (!session) return null;

  // Top bar la provee `(app)/layout`; no duplicar aquí.
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-foreground">Impresión local</h1>
        <Button type="button" variant="outlined" size="sm" onClick={() => router.push("/salon")}>
          Volver
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Elegí el agente Kai Printers por nombre. La impresión (cuando esté disponible) usa la red
        local. Puede pedirse permiso de acceso a la red local en el navegador.
      </p>
      <PrintAgentPicker
        agents={agents}
        loading={loading}
        onRefresh={() => void refresh()}
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
            }}
          >
            Guardar manual
          </Button>
        </div>
      </details>

      <section className="rounded-xl border border-border p-3">
        <h2 className="text-sm font-semibold text-foreground">
          Réplica de comanda de cocina
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Imprime una copia en la impresora de este dispositivo al enviar a cocina (además de la
          impresora de la unidad de producción).
        </p>
        <div className="mt-3">
          <Switch
            checked={kitchenReplicaEnabled}
            onChange={setKitchenReplicaEnabled}
            label="Réplica local de comanda"
            labelPosition="right"
            data-test-id="waiter-kitchen-comanda-replica-enabled"
          />
        </div>
        {kitchenReplicaEnabled && kitchenUnits.length > 0 ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              Unidades (vacío = todas las de cocina)
            </p>
            {kitchenUnits.map((u) => {
              const explicitlySelected = kitchenReplicaUnitIds.includes(u.id);
              return (
                <Switch
                  key={u.id}
                  checked={
                    kitchenReplicaUnitIds.length === 0 ? true : explicitlySelected
                  }
                  onChange={(on) => {
                    setKitchenReplicaUnitIds((prev) => {
                      if (prev.length === 0) {
                        if (!on) {
                          return kitchenUnits
                            .map((x) => x.id)
                            .filter((id) => id !== u.id);
                        }
                        return prev;
                      }
                      if (on) {
                        const next = [...new Set([...prev, u.id])];
                        if (next.length === kitchenUnits.length) return [];
                        return next;
                      }
                      return prev.filter((id) => id !== u.id);
                    });
                  }}
                  label={u.name}
                  labelPosition="right"
                  data-test-id={`waiter-kitchen-comanda-replica-unit-${u.id}`}
                />
              );
            })}
          </div>
        ) : null}
        <Button
          type="button"
          className="mt-3"
          size="sm"
          onClick={() => {
            writeWaiterKitchenComandaReplicaPrefs({
              enabled: kitchenReplicaEnabled,
              productionUnitIds: kitchenReplicaUnitIds,
            });
            setSavedMsg("Réplica de comanda guardada");
          }}
          data-test-id="waiter-kitchen-comanda-replica-save"
        >
          Guardar réplica
        </Button>
      </section>

      {savedMsg ? <p className="text-xs text-muted-foreground">{savedMsg}</p> : null}
    </div>
  );
}
