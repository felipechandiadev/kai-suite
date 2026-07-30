"use server";

import { revalidatePath } from "next/cache";
import { CompanyRequest } from "@/features/settings-branches/infrastructure/company.request";
import { AutomationRequest } from "../infrastructure/automation.request";
import { ListAutomationRulesUseCase } from "../application/list-automation-rules.usecase";
import type {
  AutomationRuleDto,
  CreateAutomationRuleInput,
  CreateAutomationRuleResult,
  DeleteAutomationRuleResult,
  UpdateAutomationRuleInput,
  UpdateAutomationRuleResult,
} from "../types/automation.types";

const PATH = "/accounting/automation";

function revalidateAutomationRoute() {
  revalidatePath(PATH, "page");
}

export async function listAutomationRulesForPage(): Promise<AutomationRuleDto[]> {
  const r = await ListAutomationRulesUseCase.execute();
  return r.success ? r.rules : [];
}

export async function createAutomationRuleAction(
  input: CreateAutomationRuleInput,
): Promise<CreateAutomationRuleResult> {
  const c = await CompanyRequest.getCurrent();
  if (!c?.id) {
    return { success: false, error: "No se pudo resolver companyId" };
  }
  const r = await AutomationRequest.create(c.id, input);
  if (r.success) {
    revalidateAutomationRoute();
  }
  return r;
}

export async function updateAutomationRuleAction(
  input: UpdateAutomationRuleInput,
): Promise<UpdateAutomationRuleResult> {
  const r = await AutomationRequest.update(input);
  if (r.success) {
    revalidateAutomationRoute();
  }
  return r;
}

export async function deleteAutomationRuleAction(
  id: string,
): Promise<DeleteAutomationRuleResult> {
  const r = await AutomationRequest.remove(id);
  if (r.success) {
    revalidateAutomationRoute();
  }
  return r;
}

