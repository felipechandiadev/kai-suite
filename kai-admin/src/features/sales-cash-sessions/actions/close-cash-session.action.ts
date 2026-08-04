"use server";

import { revalidatePath } from "next/cache";
import { CloseCashSessionUseCase } from "../application/close-cash-session.usecase";
import type { CloseCashSessionResult } from "../types/close-cash-session.types";

const LIST_PATH = "/sales/cash-sessions";

export async function closeCashSessionFromAdminAction(input: {
  sessionId: string;
  notes?: string;
}): Promise<CloseCashSessionResult> {
  const result = await CloseCashSessionUseCase.execute(input);
  if (result.success) {
    const id = input.sessionId.trim();
    revalidatePath(LIST_PATH, "page");
    revalidatePath(`${LIST_PATH}/${encodeURIComponent(id)}`, "page");
  }
  return result;
}
