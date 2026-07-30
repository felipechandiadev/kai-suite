"use server";

import { IsapreRequest } from "../infrastructure/isapre.request";
import type { IsapreView } from "../types/isapre.types";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

export async function listIsapresAction(
  includeInactive = false,
): Promise<ActionResult<IsapreView[]>> {
  try {
    const data = await IsapreRequest.list(includeInactive);
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Error al listar Isapres",
    };
  }
}
