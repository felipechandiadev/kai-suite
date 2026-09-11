"use server";

import { PricingRequest } from "../infrastructure/pricing.request";
import {
  pricingApplySnapshotSchema,
  pricingCalculateInputSchema,
} from "../lib/pricing.schema";
import type {
  PricingApplyResult,
  PricingCalculateInput,
  PricingCalculateResult,
  PricingSnapshotDetail,
  PricingSnapshotSummary,
} from "../types/pricing.types";

function parseInput(input: PricingCalculateInput) {
  const parsed = pricingCalculateInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Parámetros inválidos",
    };
  }
  return { ok: true as const, data: parsed.data };
}

export async function calculatePricingAction(
  input: PricingCalculateInput,
): Promise<{ success: true; data: PricingCalculateResult } | { success: false; error: string }> {
  const validated = parseInput(input);
  if (!validated.ok) {
    return { success: false, error: validated.error };
  }
  try {
    const data = await PricingRequest.calculate(validated.data);
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al calcular precios",
    };
  }
}

export async function savePricingSnapshotAction(
  input: PricingCalculateInput,
): Promise<{ success: true; data: PricingSnapshotDetail } | { success: false; error: string }> {
  const validated = parseInput(input);
  if (!validated.ok) {
    return { success: false, error: validated.error };
  }
  try {
    const data = await PricingRequest.saveSnapshot(validated.data);
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al guardar análisis",
    };
  }
}

export async function listPricingSnapshotsAction(
  weekIso?: string,
): Promise<{ success: true; data: PricingSnapshotSummary[] } | { success: false; error: string }> {
  try {
    const data = await PricingRequest.listSnapshots(weekIso);
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al listar snapshots",
    };
  }
}

export async function applyPricingSnapshotAction(
  snapshotId: string,
): Promise<{ success: true; data: PricingApplyResult } | { success: false; error: string }> {
  const parsed = pricingApplySnapshotSchema.safeParse({ snapshotId });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Snapshot inválido",
    };
  }
  try {
    const data = await PricingRequest.applySnapshot(parsed.data.snapshotId);
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al aplicar precios",
    };
  }
}
