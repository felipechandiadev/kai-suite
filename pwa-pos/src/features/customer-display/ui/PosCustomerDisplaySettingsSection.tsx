"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_DISPLAY_WSS_PORT,
  DEFAULT_DISPLAY_WS_PORT,
  DisplayConnection,
  KaiScreenDownloadSection,
  buildDisplayWebSocketUrl,
  emptyIdleSnapshot,
  readCustomerDisplayFromStorage,
  writeCustomerDisplayToStorage,
  type DisplayStatusPayload,
  type KaiScreenAndroidManifest,
} from "@flowstore/customer-display-client";
import { getCustomerDisplayStatus } from "@/features/customer-display/lib/customer-display-publisher";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import { Button, Switch, TextField } from "@/shared/admin-shared";

type Props = {
  className?: string;
  kaiScreenAndroidManifest?: KaiScreenAndroidManifest;
};

function StatusCheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          ok ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"
        }`}
        aria-hidden
      >
        {ok ? "✓" : "·"}
      </span>
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}

export function PosCustomerDisplaySettingsSection({
  className = "",
  kaiScreenAndroidManifest,
}: Props) {
  const [enabled, setEnabled] = useState(false);
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState(DEFAULT_DISPLAY_WSS_PORT);
  const [useTls, setUseTls] = useState(true);
  const [agentStatus, setAgentStatus] = useState<DisplayStatusPayload | null>(null);
  const [testBusy, setTestBusy] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  useEffect(() => {
    const cfg = readCustomerDisplayFromStorage();
    setEnabled(cfg.enabled);
    setHost(cfg.host);
    setPort(cfg.port);
    setUseTls(cfg.useTls);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setAgentStatus(getCustomerDisplayStatus());
    }, 1000);
    return () => clearInterval(t);
  }, [enabled]);

  const persist = useCallback(
    (patch: Partial<{ enabled: boolean; host: string; port: number; useTls: boolean }>) => {
      writeCustomerDisplayToStorage(patch);
    },
    [],
  );

  const agentConnected = enabled && (agentStatus?.connected ?? false);
  const displayAttached = enabled && (agentStatus?.displayAttached ?? false);
  const operativo = agentConnected && displayAttached;

  const onTestDisplay = async () => {
    const ctx = readPosContextClient();
    const posId = ctx?.pointOfSaleId?.trim();
    if (!posId) return;

    setTestBusy(true);
    setTestMessage(null);

    if (enabled && agentStatus && !agentStatus.displayAttached) {
      setTestMessage(
        "Aviso: Kai Screen no detecta pantalla secundaria. La prueba se enviará igual; revise el cable HDMI o el módulo dual-screen.",
      );
    }

    try {
      const url = buildDisplayWebSocketUrl(host, port, useTls);
      const client = new DisplayConnection({
        url,
        pointOfSaleId: posId,
        storeName: ctx?.pointOfSaleName ?? ctx?.branchName ?? undefined,
        appLabel: "Punto de venta (prueba)",
        onDisplayStatus: (status) => {
          setAgentStatus(status);
        },
      });
      client.connect();
      await new Promise((r) => setTimeout(r, 500));
      client.publishSnapshot({
        ...emptyIdleSnapshot({
          pointOfSaleId: posId,
          storeName: ctx?.pointOfSaleName ?? undefined,
        }),
        state: "active_sale",
        lines: [
          {
            lineId: "demo",
            name: "Producto de prueba",
            quantity: 1,
            unitPrice: 1990,
            lineTotal: 1990,
          },
        ],
        total: 1990,
        itemCount: 1,
      });
      await new Promise((r) => setTimeout(r, 2500));
      client.disconnect();
      setTestMessage((prev) =>
        prev
          ? `${prev} Si ves «Producto de prueba» en la pantalla del cliente, está OK.`
          : "Prueba enviada. Si ves «Producto de prueba» en la pantalla del cliente, está OK.",
      );
    } catch {
      setTestMessage("No se pudo enviar la prueba. Verifique que Kai Screen esté activo y el certificado WSS confiado.");
    } finally {
      setTestBusy(false);
    }
  };

  return (
    <section className={`rounded-xl border border-border bg-background p-4 ${className}`.trim()}>
      <h2 className="text-base font-semibold text-foreground">Pantalla cliente (Kai Screen)</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Muestra el carrito al cliente en la segunda pantalla de la tablet. Requiere la app Kai Screen en
        el mismo equipo.
      </p>

      <KaiScreenDownloadSection className="mt-4" initialManifest={kaiScreenAndroidManifest} />

      <div className="mt-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Activar Kai Screen</span>
          <Switch
            checked={enabled}
            onChange={(v) => {
              setEnabled(v);
              persist({ enabled: v });
            }}
          />
        </div>

        <TextField
          label="Host"
          name="customer-display-host"
          value={host}
          onChange={(e) => {
            const v = e.target.value;
            setHost(v);
            persist({ host: v });
          }}
          alwaysShowLabel
        />

        <TextField
          label="Puerto"
          name="customer-display-port"
          type="number"
          value={String(port)}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isFinite(n) || n <= 0) return;
            setPort(n);
            persist({ port: n });
          }}
          alwaysShowLabel
        />

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Usar WSS (HTTPS en POS)</span>
          <Switch
            checked={useTls}
            onChange={(v) => {
              setUseTls(v);
              const nextPort = v ? DEFAULT_DISPLAY_WSS_PORT : DEFAULT_DISPLAY_WS_PORT;
              setPort(nextPort);
              persist({ useTls: v, port: nextPort });
            }}
          />
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-sm font-medium text-foreground">Estado operativo</p>
          <ul className="mt-2 space-y-1.5" data-test-id="kai-screen-status-checklist">
            <StatusCheckItem ok={enabled} label="Kai Screen activado en el POS" />
            <StatusCheckItem
              ok={agentConnected}
              label={
                agentConnected
                  ? "Agente Kai Screen conectado"
                  : enabled
                    ? "Agente Kai Screen desconectado"
                    : "Agente Kai Screen (desactivado)"
              }
            />
            <StatusCheckItem
              ok={displayAttached}
              label={
                displayAttached
                  ? "Pantalla secundaria detectada"
                  : agentConnected
                    ? "Sin pantalla secundaria detectada"
                    : "Pantalla secundaria (pendiente de conexión)"
              }
            />
          </ul>
          {operativo ? (
            <p className="mt-2 text-sm font-medium text-emerald-700">Listo para caja</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outlined"
              disabled={testBusy}
              onClick={() => void onTestDisplay()}
            >
              {testBusy ? "Enviando…" : "Probar pantalla"}
            </Button>
          </div>
          {testMessage ? (
            <p className="text-sm text-muted-foreground" data-test-id="kai-screen-test-message">
              {testMessage}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
