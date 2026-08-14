"use server";

import { revalidatePath } from "next/cache";
import { PrintAgentsRequest } from "../infrastructure/print-agents.request";
import type { CreatePrintAgentResult, PrintAgentDto } from "../types/print-agent.types";

export async function listPrintAgentsAction(): Promise<PrintAgentDto[]> {
  return PrintAgentsRequest.list();
}

export async function createPrintAgentAction(input?: {
  displayName?: string;
  branchId?: string;
}): Promise<CreatePrintAgentResult> {
  const row = await PrintAgentsRequest.create(input ?? {});
  revalidatePath("/settings/local-printing", "page");
  return row;
}

export async function revokePrintAgentAction(id: string): Promise<PrintAgentDto> {
  const row = await PrintAgentsRequest.revoke(id);
  revalidatePath("/settings/local-printing", "page");
  return row;
}
