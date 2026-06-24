"use client";

import { useCallback, useEffect, useId, useState } from "react";
import {
  DEFAULT_DISPLAY_WSS_PORT,
  DEFAULT_DISPLAY_WS_PORT,
  DisplayConnection,
  buildDisplayWebSocketUrl,
  emptyIdleSnapshot,
  readCustomerDisplayFromStorage,
  writeCustomerDisplayToStorage,
} from "@flowstore/customer-display-client";

type Props = {
  className?: string;
};

export function PosCustomerDisplaySettingsSection({ className = "" }: Props) {
  const switchId = useId();
  const [enabled, setEnabled] = useState(false);
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState(DEFAULT_DISPLAY_WSS_PORT);
  const [useTls, setUseTls] = useState(true);
  const [statusLabel, setStatusLabel] = useState("Desconectado");
  const [testBusy, setTestBusy] = useState(false);

  useEffect(() => {
    const cfg = readCustomerDisplayFromStorage();
    setEnabled(cfg.enabled);
    setHost(cfg.host);
    setPort(cfg.port);
    setUseTls(cfg.useTls);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      const s = getCustomerDisplayStatus();
      if (!enabled) {
        setStatusLabel("Desactivado");
        return;
      }
      if (!s) {
        setStatusLabel("Desconectado");
        return;
      }
      if (s.displayAttached && s.connected) {
        setStatusLabel("Conectado — pantalla OK");
      } else if (s.connected) {
        setStatusLabel("Conectado — sin pantalla secundaria");
      } else {
        setStatusLabel(s.message ?? "Desconectado");
      }
    }, 1000);
    return () => clearInterval(t);
  }, [enabled]);

  const persist = useCallback(
    (patch: Partial<{ enabled: boolean; host: string; port: number; useTls: boolean }>) => {
      writeCustomerDisplayToStorage(patch);
    },
    [],
  );

  const onTestDisplay = async () => {
    const ctx = readPosContextClient();
    const posId = ctx?.pointOfSaleId?.trim();
    if (!posId) return;
    setTestBusy(true);
    try {
      const url = buildDisplayWebSocketUrl(host, port, useTls);
      const client = new DisplayConnection({
        url,
        pointOfSaleId: posId,
        storeName: ctx?.pointOfSaleName ?? ctx?.branchName ?? undefined,
        appLabel: "Punto de venta (prueba)",
      });
      client.connect();
      await new Promise((r) => setTimeout(r, 400));
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
      await new Promise((r) => setTimeout(r, 800));
      client.disconnect();
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

      <div className="mt-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={switchId} className="text-sm font-medium">
            Activar Kai Screen
          </label>
          <Switch
            id={switchId}
            checked={enabled}
            onCheckedChange={(v) => {
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
            onCheckedChange={(v) => {
              setUseTls(v);
              const nextPort = v ? DEFAULT_DISPLAY_WSS_PORT : DEFAULT_DISPLAY_WS_PORT;
              setPort(nextPort);
              persist({ useTls: v, port: nextPort });
            }}
          />
        </div>

        <p className="text-sm text-muted-foreground">Estado: {statusLabel}</p>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outlined" disabled={testBusy} onClick={() => void onTestDisplay()}>
            {testBusy ? "Enviando…" : "Probar pantalla"}
          </Button>
          <a
            href="/downloads/kai-screen-android.apk"
            download
            className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Descargar Kai Screen (Android)
          </a>
        </div>
      </div>
    </section>
  );
}
