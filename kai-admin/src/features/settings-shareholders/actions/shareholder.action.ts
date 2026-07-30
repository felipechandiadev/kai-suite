"use server";

import { revalidatePath } from "next/cache";
import { ShareholderRequest } from "../infrastructure/shareholder.request";
import type { CreateShareholderInput, ShareholderRow } from "../types/shareholder.types";

const COMPANY_PATH = "/settings/company";

export async function listShareholdersAction(companyId: string): Promise<ShareholderRow[]> {
  if (!companyId?.trim()) {
    return [];
  }
  return ShareholderRequest.list(companyId.trim());
}

export async function createShareholderAction(
  input: CreateShareholderInput,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await ShareholderRequest.create(input);
    revalidatePath(COMPANY_PATH, "page");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "No se pudo crear el socio" };
  }
}

export async function deleteShareholderAction(
  companyId: string,
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await ShareholderRequest.remove(companyId, id);
    revalidatePath(COMPANY_PATH, "page");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "No se pudo eliminar el socio" };
  }
}
