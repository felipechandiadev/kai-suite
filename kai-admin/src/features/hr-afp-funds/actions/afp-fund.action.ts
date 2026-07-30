"use server";

import { revalidatePath } from "next/cache";
import { SETTINGS_HCM } from "@/navigation/hcm-routes";
import { AfpFundRequest } from "../infrastructure/afp-fund.request";
import type { CreateAfpFundInput } from "../types/afp-fund.types";

function ok<T>(data: T) {
  return { success: true as const, data };
}
function fail(message: string) {
  return { success: false as const, message };
}

export async function listAfpFundsAction(includeInactive = false) {
  try {
    return ok(await AfpFundRequest.list(includeInactive));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error AFP");
  }
}

export async function createAfpFundAction(body: CreateAfpFundInput) {
  try {
    const data = await AfpFundRequest.create(body);
    revalidatePath(SETTINGS_HCM, "layout");
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al crear AFP");
  }
}

export async function updateAfpFundAction(
  id: string,
  body: Partial<CreateAfpFundInput>,
) {
  try {
    const data = await AfpFundRequest.update(id, body);
    revalidatePath(SETTINGS_HCM, "layout");
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al actualizar AFP");
  }
}
