/**
 * Helpers compartidos para comanda de cocina (payload + prefs réplica).
 */

import type { PosSaleTicketCompany } from "./pos-sale-ticket";
import {
  POS_KITCHEN_TICKET_FOOTER_NOTE,
  POS_KITCHEN_TICKET_PAYLOAD_VERSION,
  type PosKitchenTicketPayload,
} from "./pos-kitchen-ticket";

export type KitchenFulfillmentModeClient = "KDS" | "PRINTED" | "BOTH";

export type KitchenPrintSettingsClient = {
  printAgentId?: string | null;
  printerDisplayLabel?: string | null;
};

export type KitchenUnitPrintInfo = {
  id: string;
  name: string;
  kitchenFulfillmentMode: KitchenFulfillmentModeClient;
  kitchenPrintSettings?: KitchenPrintSettingsClient | null;
};

export function kitchenUnitShouldPrint(
  mode: KitchenFulfillmentModeClient | string | null | undefined,
): boolean {
  return mode === "PRINTED" || mode === "BOTH";
}

/** UP con modo que requiere binding de impresora en POS/Waiter. */
export function kitchenUnitRequiresPrintBinding(
  mode: KitchenFulfillmentModeClient | string | null | undefined,
): boolean {
  return kitchenUnitShouldPrint(mode);
}

export type KitchenUnitPrintBinding = {
  printAgentId?: string | null;
  printerDisplayLabel?: string | null;
};

export type KitchenUnitPrintBindingsMap = Record<string, KitchenUnitPrintBinding>;

const POS_BINDINGS_KEY = "printPosKitchenUnitBindings";
const WAITER_BINDINGS_KEY = "printWaiterKitchenUnitBindings";
const POS_BINDINGS_MIGRATED_KEY = "printPosKitchenUnitBindingsMigrated";
const WAITER_BINDINGS_MIGRATED_KEY = "printWaiterKitchenUnitBindingsMigrated";

function sanitizeBinding(raw: unknown): KitchenUnitPrintBinding | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const printAgentId =
    o.printAgentId != null && String(o.printAgentId).trim()
      ? String(o.printAgentId).trim()
      : null;
  const printerDisplayLabel =
    o.printerDisplayLabel != null && String(o.printerDisplayLabel).trim()
      ? String(o.printerDisplayLabel).trim()
      : null;
  if (!printAgentId && !printerDisplayLabel) return null;
  return { printAgentId, printerDisplayLabel };
}

function readBindingsMap(storageKey: string): KitchenUnitPrintBindingsMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: KitchenUnitPrintBindingsMap = {};
    for (const [id, value] of Object.entries(parsed)) {
      const key = String(id).trim();
      if (!key) continue;
      const binding = sanitizeBinding(value);
      if (binding) out[key] = binding;
    }
    return out;
  } catch {
    return {};
  }
}

function writeBindingsMap(
  storageKey: string,
  map: KitchenUnitPrintBindingsMap,
): void {
  if (typeof window === "undefined") return;
  const cleaned: KitchenUnitPrintBindingsMap = {};
  for (const [id, binding] of Object.entries(map)) {
    const key = String(id).trim();
    if (!key) continue;
    const sanitized = sanitizeBinding(binding);
    if (sanitized) cleaned[key] = sanitized;
  }
  if (Object.keys(cleaned).length === 0) {
    localStorage.removeItem(storageKey);
    return;
  }
  localStorage.setItem(storageKey, JSON.stringify(cleaned));
}

export function readPosKitchenUnitPrintBindings(): KitchenUnitPrintBindingsMap {
  return readBindingsMap(POS_BINDINGS_KEY);
}

export function writePosKitchenUnitPrintBindings(
  map: KitchenUnitPrintBindingsMap,
): void {
  writeBindingsMap(POS_BINDINGS_KEY, map);
}

export function readWaiterKitchenUnitPrintBindings(): KitchenUnitPrintBindingsMap {
  return readBindingsMap(WAITER_BINDINGS_KEY);
}

export function writeWaiterKitchenUnitPrintBindings(
  map: KitchenUnitPrintBindingsMap,
): void {
  writeBindingsMap(WAITER_BINDINGS_KEY, map);
}

export function resolveKitchenUnitPrintBinding(
  bindings: KitchenUnitPrintBindingsMap,
  productionUnitId: string,
): KitchenUnitPrintBinding | null {
  const id = productionUnitId.trim();
  if (!id) return null;
  return bindings[id] ?? null;
}

export function kitchenUnitPrintBindingConfigured(
  binding: KitchenUnitPrintBinding | null | undefined,
): boolean {
  if (!binding) return false;
  return Boolean(
    binding.printAgentId?.trim() || binding.printerDisplayLabel?.trim(),
  );
}

/**
 * Una vez: copia `kitchenPrintSettings` del Core a localStorage si el mapa local está vacío.
 */
export function migrateKitchenBindingsFromServer(
  app: "pos" | "waiter",
  units: KitchenUnitPrintInfo[],
): KitchenUnitPrintBindingsMap {
  const migratedKey =
    app === "pos" ? POS_BINDINGS_MIGRATED_KEY : WAITER_BINDINGS_MIGRATED_KEY;
  const read =
    app === "pos"
      ? readPosKitchenUnitPrintBindings
      : readWaiterKitchenUnitPrintBindings;
  const write =
    app === "pos"
      ? writePosKitchenUnitPrintBindings
      : writeWaiterKitchenUnitPrintBindings;

  const existing = read();
  if (typeof window !== "undefined" && localStorage.getItem(migratedKey) === "1") {
    return existing;
  }
  if (Object.keys(existing).length > 0) {
    if (typeof window !== "undefined") {
      localStorage.setItem(migratedKey, "1");
    }
    return existing;
  }

  const next: KitchenUnitPrintBindingsMap = { ...existing };
  let changed = false;
  for (const unit of units) {
    if (!kitchenUnitRequiresPrintBinding(unit.kitchenFulfillmentMode)) continue;
    const legacy = unit.kitchenPrintSettings;
    if (!legacy) continue;
    const printAgentId = legacy.printAgentId?.trim() || null;
    const printerDisplayLabel = legacy.printerDisplayLabel?.trim() || null;
    if (!printAgentId && !printerDisplayLabel) continue;
    if (!next[unit.id]) {
      next[unit.id] = { printAgentId, printerDisplayLabel };
      changed = true;
    }
  }
  if (changed) write(next);
  if (typeof window !== "undefined") {
    localStorage.setItem(migratedKey, "1");
  }
  return changed ? next : existing;
}

export function fulfillmentModeLabel(
  mode: KitchenFulfillmentModeClient | string | null | undefined,
): string {
  if (mode === "PRINTED") return "Comanda impresa";
  if (mode === "BOTH") return "KDS + comanda impresa";
  return "Solo KDS";
}

export type BuildKitchenTicketInput = {
  company: PosSaleTicketCompany;
  productionUnitName: string;
  fireNumber: number;
  accountLabel: string;
  tableCode?: string | null;
  branchName?: string | null;
  issuedAt?: string;
  lines: Array<{ name: string; quantity: number; notes?: string | null }>;
  isReplica?: boolean;
};

export function buildPosKitchenTicketPayload(
  input: BuildKitchenTicketInput,
): PosKitchenTicketPayload {
  return {
    version: POS_KITCHEN_TICKET_PAYLOAD_VERSION,
    company: input.company,
    productionUnitName: input.productionUnitName.trim() || "Cocina",
    fireNumber: Math.max(0, Math.floor(Number(input.fireNumber) || 0)),
    accountLabel: input.accountLabel.trim() || "Cuenta",
    tableCode: input.tableCode?.trim() || null,
    branchName: input.branchName?.trim() || null,
    issuedAt: input.issuedAt ?? new Date().toISOString(),
    lines: input.lines.map((l) => ({
      name: l.name.trim() || "Ítem",
      quantity: Number(l.quantity) || 0,
      notes: l.notes?.trim() || null,
    })),
    footerNote: POS_KITCHEN_TICKET_FOOTER_NOTE,
    isReplica: input.isReplica === true,
  };
}

const POS_REPLICA_ENABLED_KEY = "printPosKitchenComandaReplicaEnabled";
const POS_REPLICA_UNITS_KEY = "printPosKitchenComandaReplicaUnitIds";
const WAITER_REPLICA_ENABLED_KEY = "printWaiterKitchenComandaReplicaEnabled";
const WAITER_REPLICA_UNITS_KEY = "printWaiterKitchenComandaReplicaUnitIds";

export type KitchenComandaReplicaPrefs = {
  enabled: boolean;
  productionUnitIds: string[];
};

function readReplicaPrefs(
  enabledKey: string,
  unitsKey: string,
): KitchenComandaReplicaPrefs {
  if (typeof window === "undefined") {
    return { enabled: false, productionUnitIds: [] };
  }
  const enabled = localStorage.getItem(enabledKey) === "1";
  let productionUnitIds: string[] = [];
  try {
    const raw = localStorage.getItem(unitsKey);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        productionUnitIds = parsed
          .map((x) => String(x).trim())
          .filter(Boolean);
      }
    }
  } catch {
    productionUnitIds = [];
  }
  return { enabled, productionUnitIds };
}

function writeReplicaPrefs(
  enabledKey: string,
  unitsKey: string,
  prefs: KitchenComandaReplicaPrefs,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(enabledKey, prefs.enabled ? "1" : "0");
  localStorage.setItem(
    unitsKey,
    JSON.stringify([...new Set(prefs.productionUnitIds.filter(Boolean))]),
  );
}

export function readPosKitchenComandaReplicaPrefs(): KitchenComandaReplicaPrefs {
  return readReplicaPrefs(POS_REPLICA_ENABLED_KEY, POS_REPLICA_UNITS_KEY);
}

export function writePosKitchenComandaReplicaPrefs(
  prefs: KitchenComandaReplicaPrefs,
): void {
  writeReplicaPrefs(POS_REPLICA_ENABLED_KEY, POS_REPLICA_UNITS_KEY, prefs);
}

export function readWaiterKitchenComandaReplicaPrefs(): KitchenComandaReplicaPrefs {
  return readReplicaPrefs(WAITER_REPLICA_ENABLED_KEY, WAITER_REPLICA_UNITS_KEY);
}

export function writeWaiterKitchenComandaReplicaPrefs(
  prefs: KitchenComandaReplicaPrefs,
): void {
  writeReplicaPrefs(WAITER_REPLICA_ENABLED_KEY, WAITER_REPLICA_UNITS_KEY, prefs);
}

export function replicaIncludesUnit(
  prefs: KitchenComandaReplicaPrefs,
  productionUnitId: string,
  mode?: KitchenFulfillmentModeClient | string | null,
): boolean {
  if (!prefs.enabled) return false;
  if (mode != null && !kitchenUnitRequiresPrintBinding(mode)) return false;
  if (prefs.productionUnitIds.length === 0) return true;
  return prefs.productionUnitIds.includes(productionUnitId);
}

export type KitchenFireLineForPrint = {
  id: string;
  productVariantId: string;
  quantity: number;
  notes?: string | null;
  productionUnitId?: string | null;
  kitchenStatus: string;
  kitchenFireId?: string | null;
  kitchenFireNumber?: number | null;
};

export type KitchenComandaPrintJob = {
  productionUnitId: string;
  fireNumber: number;
  fireId: string | null;
  lines: Array<{ name: string; quantity: number; notes?: string | null }>;
};

const ACTIVE_KITCHEN_STATUSES = new Set(["SENT", "PREPARING"]);

/**
 * Agrupa líneas recién enviadas a cocina por UP para imprimir comanda(s).
 * Si `sentLineIds` viene vacío, usa el fireNumber máximo entre líneas activas.
 */
export function collectKitchenComandaPrintJobs(
  orderLines: KitchenFireLineForPrint[],
  sentLineIds: string[] | undefined,
  resolveName: (line: KitchenFireLineForPrint) => string,
): KitchenComandaPrintJob[] {
  let candidates = orderLines.filter(
    (l) =>
      ACTIVE_KITCHEN_STATUSES.has(String(l.kitchenStatus)) &&
      Boolean(l.productionUnitId?.trim()),
  );
  if (sentLineIds && sentLineIds.length > 0) {
    const set = new Set(sentLineIds);
    candidates = candidates.filter((l) => set.has(l.id));
  } else if (candidates.length > 0) {
    const maxFire = Math.max(
      ...candidates.map((l) =>
        l.kitchenFireNumber != null && Number.isFinite(Number(l.kitchenFireNumber))
          ? Number(l.kitchenFireNumber)
          : 0,
      ),
    );
    candidates = candidates.filter(
      (l) =>
        (l.kitchenFireNumber != null && Number.isFinite(Number(l.kitchenFireNumber))
          ? Number(l.kitchenFireNumber)
          : 0) === maxFire,
    );
  }

  const byKey = new Map<string, KitchenComandaPrintJob>();
  for (const line of candidates) {
    const productionUnitId = String(line.productionUnitId).trim();
    const fireNumber =
      line.kitchenFireNumber != null && Number.isFinite(Number(line.kitchenFireNumber))
        ? Number(line.kitchenFireNumber)
        : 0;
    const fireId = line.kitchenFireId?.trim() || null;
    const key = `${productionUnitId}::${fireNumber}::${fireId ?? ""}`;
    let job = byKey.get(key);
    if (!job) {
      job = {
        productionUnitId,
        fireNumber,
        fireId,
        lines: [],
      };
      byKey.set(key, job);
    }
    job.lines.push({
      name: resolveName(line),
      quantity: Number(line.quantity) || 0,
      notes: line.notes?.trim() || null,
    });
  }
  return [...byKey.values()].filter((j) => j.lines.length > 0);
}
