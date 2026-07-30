"use server";

import { revalidatePath } from "next/cache";
import { CreateAccountingRuleUseCase } from "../application/create-accounting-rule.usecase";
import { DeleteAccountingRuleUseCase } from "../application/delete-accounting-rule.usecase";
import { ListAccountingRulesUseCase } from "../application/list-accounting-rules.usecase";
import { UpdateAccountingRuleUseCase } from "../application/update-accounting-rule.usecase";
import type { CreateAccountingRuleFormInput, UpdateAccountingRuleFormInput } from "../domain/accounting-rule.entity";
import type { CreateAccountingRuleResult, DeleteAccountingRuleResult, ListAccountingRulesResult, UpdateAccountingRuleResult } from "../types/accounting-rule.types";

const PATH = "/accounting/rules";

function revalidateRulesRoute() {
  revalidatePath(PATH, "page");
}

export async function listAccountingRulesForPage(): Promise<ListAccountingRulesResult> {
  return ListAccountingRulesUseCase.execute();
}

export async function createAccountingRuleAction(input: CreateAccountingRuleFormInput): Promise<CreateAccountingRuleResult> {
  const r = await CreateAccountingRuleUseCase.execute(input);
  if (r.success) revalidateRulesRoute();
  return r;
}

export async function updateAccountingRuleAction(input: UpdateAccountingRuleFormInput): Promise<UpdateAccountingRuleResult> {
  const r = await UpdateAccountingRuleUseCase.execute(input);
  if (r.success) revalidateRulesRoute();
  return r;
}

export async function deleteAccountingRuleAction(id: string): Promise<DeleteAccountingRuleResult> {
  const r = await DeleteAccountingRuleUseCase.execute(id);
  if (r.success) revalidateRulesRoute();
  return r;
}

