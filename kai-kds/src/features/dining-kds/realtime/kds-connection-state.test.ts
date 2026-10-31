import { describe, expect, it } from "vitest";
import {
  initialKdsConnectionState,
  kdsConnectionLabel,
  kdsReconnectDelayMs,
  reduceKdsConnection,
  type KdsConnectionEvent,
  type KdsConnectionState,
} from "./kds-connection-state";

function run(events: Array<[KdsConnectionEvent["type"], number]>) {
  let state: KdsConnectionState = initialKdsConnectionState(0);
  const alerts: Array<[string, number]> = [];
  for (const [type, t] of events) {
    const r = reduceKdsConnection(state, { type } as KdsConnectionEvent, t, 5000);
    state = r.state;
    if (r.alert) alerts.push([r.alert, t]);
  }
  return { state, alerts };
}

describe("reduceKdsConnection", () => {
  it("arranca en connecting y pasa a connected sin alerta", () => {
    const { state, alerts } = run([["connected", 100]]);
    expect(state.status).toBe("connected");
    expect(alerts).toEqual([]);
  });

  it("caída corta: reconnecting sin alerta", () => {
    const { state, alerts } = run([
      ["connected", 0],
      ["disconnected", 1000],
      ["tick", 3000],
      ["connected", 4000],
    ]);
    expect(state.status).toBe("connected");
    expect(alerts).toEqual([]);
  });

  it("caída larga: offline + alerta lost una vez, restored al volver", () => {
    const { state, alerts } = run([
      ["connected", 0],
      ["disconnected", 1000],
      ["tick", 2000],
      ["tick", 6000],
      ["disconnected", 7000],
      ["tick", 9000],
      ["connected", 12000],
    ]);
    expect(state.status).toBe("connected");
    expect(alerts).toEqual([
      ["lost", 6000],
      ["restored", 12000],
    ]);
  });

  it("varios disconnected no reinician el contador de caída", () => {
    const { state } = run([
      ["connected", 0],
      ["disconnected", 1000],
      ["disconnected", 4000],
      ["tick", 6100],
    ]);
    expect(state.status).toBe("offline");
    expect(state.downSince).toBe(1000);
  });

  it("sin conexión desde el arranque: offline sin sonido", () => {
    const { state, alerts } = run([["tick", 6000]]);
    expect(state.status).toBe("offline");
    expect(alerts).toEqual([]);
  });

  it("reset vuelve a connecting", () => {
    const { state } = run([["connected", 0], ["reset", 10]]);
    expect(state.status).toBe("connecting");
    expect(state.everConnected).toBe(false);
  });
});

describe("kdsReconnectDelayMs", () => {
  it("crece exponencialmente y se acota", () => {
    const noJitter = { jitter: 0 };
    expect(kdsReconnectDelayMs(0, noJitter)).toBe(1000);
    expect(kdsReconnectDelayMs(1, noJitter)).toBe(2000);
    expect(kdsReconnectDelayMs(3, noJitter)).toBe(8000);
    expect(kdsReconnectDelayMs(10, noJitter)).toBe(15000);
  });

  it("aplica jitter dentro del rango", () => {
    expect(kdsReconnectDelayMs(1, { jitter: 0.5, random: () => 0 })).toBe(1000);
    expect(kdsReconnectDelayMs(1, { jitter: 0.5, random: () => 1 })).toBe(3000);
    expect(kdsReconnectDelayMs(10, { jitter: 0.5, random: () => 1 })).toBe(15000);
  });
});

it("etiquetas visibles", () => {
  expect(kdsConnectionLabel("connected")).toBe("Conectado");
  expect(kdsConnectionLabel("reconnecting")).toBe("Reconectando");
  expect(kdsConnectionLabel("offline")).toBe("Sin conexión");
});
