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

const POS_INCLUDE_BRANCH_KEY = "kai.pos.print.includeBranchName";
const WAITER_INCLUDE_BRANCH_KEY = "kai.waiter.print.includeBranchName";

function readIncludeBranchName(key: string): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(key);
  if (raw == null) return true; // default on
  return raw !== "0";
}

function writeIncludeBranchName(key: string, include: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, include ? "1" : "0");
}

export function readPosIncludeBranchName(): boolean {
  return readIncludeBranchName(POS_INCLUDE_BRANCH_KEY);
}

export function writePosIncludeBranchName(include: boolean): void {
  writeIncludeBranchName(POS_INCLUDE_BRANCH_KEY, include);
}

export function readWaiterIncludeBranchName(): boolean {
  return readIncludeBranchName(WAITER_INCLUDE_BRANCH_KEY);
}

export function writeWaiterIncludeBranchName(include: boolean): void {
  writeIncludeBranchName(WAITER_INCLUDE_BRANCH_KEY, include);
}

/** Aplica preferencia: si include=false o raw vacío → null. */
export function resolveTicketBranchName(
  raw: string | null | undefined,
  include: boolean,
): string | null {
  if (!include) return null;
  const t = raw?.trim();
  return t ? t : null;
}

export function replicaIncludesUnit(
  prefs: KitchenComandaReplicaPrefs,
  productionUnitId: string,
): boolean {
  if (!prefs.enabled) return false;
  if (prefs.productionUnitIds.length === 0) return true; // all kitchen UPs
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
