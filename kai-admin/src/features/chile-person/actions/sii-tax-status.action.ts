"use server";

import { lookupSiiTaxStatusRequest } from "../infrastructure/sii-tax-status.request";
import type { LookupSiiTaxStatusResult } from "../types/sii-tax-status.types";

export async function lookupSiiTaxStatusAction(rut: string): Promise<LookupSiiTaxStatusResult> {
  const trimmed = rut.trim();
  if (!trimmed) {
    return { success: false, error: "Ingrese un RUT" };
  }
  return lookupSiiTaxStatusRequest(trimmed);
}
