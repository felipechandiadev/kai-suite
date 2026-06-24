import {
  DisplayConnection,
  buildDisplayWebSocketUrl,
  readCustomerDisplayFromStorage,
  type CustomerDisplayEvent,
  type CustomerDisplaySnapshot,
  type DisplayStatusPayload,
} from "@flowstore/customer-display-client";
import { buildCustomerDisplaySnapshot } from "./build-customer-display-snapshot";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosContextV1 } from "@/features/session/lib/pos-context-storage";

type CartSlice = {
  lines: PosCartLine[];
  orderDiscount: number;
};

type PosCtx = Pick<PosContextV1, "pointOfSaleId" | "pointOfSaleName" | "branchName"> | null;

let connection: DisplayConnection | null = null;
let lastStatus: DisplayStatusPayload | null = null;
let paymentDisplayActive = false;

export function setCustomerDisplayPaymentMode(active: boolean): void {
  paymentDisplayActive = active;
}

export function isCustomerDisplayPaymentMode(): boolean {
  return paymentDisplayActive;
}

export function getCustomerDisplayStatus(): DisplayStatusPayload | null {
  return lastStatus;
}

function ensureCustomerDisplayConnection(ctx: PosCtx): DisplayConnection | null {
  const cfg = readCustomerDisplayFromStorage();
  if (!cfg.enabled || !ctx?.pointOfSaleId) {
    disconnectCustomerDisplay();
    return null;
  }

  const url = buildDisplayWebSocketUrl(cfg.host, cfg.port, cfg.useTls);
  if (!connection) {
    connection = new DisplayConnection({
      url,
      pointOfSaleId: ctx.pointOfSaleId,
      storeName: ctx.pointOfSaleName ?? ctx.branchName ?? undefined,
      appLabel: "Punto de venta",
      token: cfg.token,
      onDisplayStatus: (status) => {
        lastStatus = status;
      },
      onError: () => {
        // best-effort
      },
    });
    connection.connect();
  }
  return connection;
}

export function syncCustomerDisplayPublisher(cart: CartSlice, ctx: PosCtx): void {
  if (paymentDisplayActive) return;

  const conn = ensureCustomerDisplayConnection(ctx);
  if (!conn) return;

  const snapshot = buildCustomerDisplaySnapshot({
    lines: cart.lines,
    orderDiscount: cart.orderDiscount,
    ctx,
  });
  if (snapshot) {
    conn.publishSnapshot(snapshot);
  }
}

export function syncCustomerDisplayPayment(snapshot: CustomerDisplaySnapshot | null, ctx: PosCtx): void {
  const conn = ensureCustomerDisplayConnection(ctx);
  if (!conn || !snapshot) return;
  conn.publishSnapshot(snapshot);
}

export function notifyCustomerDisplaySaleCompleted(
  total: number,
  pointOfSaleId: string,
): void {
  if (!connection) return;
  const event: CustomerDisplayEvent = {
    type: "sale_completed",
    pointOfSaleId,
    total,
    updatedAt: new Date().toISOString(),
  };
  connection.publishEvent(event);
}

export function notifyCustomerDisplayIdle(pointOfSaleId: string): void {
  if (!connection) return;
  const event: CustomerDisplayEvent = {
    type: "idle",
    pointOfSaleId,
    updatedAt: new Date().toISOString(),
  };
  connection.publishEvent(event);
}

export function disconnectCustomerDisplay(): void {
  connection?.disconnect();
  connection = null;
  lastStatus = null;
}

/** @internal test helper */
export function resetCustomerDisplayPublisherForTests(): void {
  disconnectCustomerDisplay();
}
