"use server";

import { revalidatePath } from "next/cache";
import { CreateTaxUseCase } from "../application/create-tax.usecase";
import { DeleteTaxUseCase } from "../application/delete-tax.usecase";
import { ListTaxesUseCase } from "../application/list-taxes.usecase";
import { UpdateTaxUseCase } from "../application/update-tax.usecase";
import { TaxRequest } from "../infrastructure/tax.request";
import type { CreateTaxFormInput, UpdateTaxFormInput } from "../domain/tax.entity";
import type {
  CreateTaxResult,
  DeleteTaxResult,
  TaxListItem,
  UpdateTaxResult,
} from "../types/tax.types";

const PATH = "/accounting/taxes";

function revalidateTaxesRoute() {
  revalidatePath(PATH, "page");
}

export async function listTaxesForPage(): Promise<TaxListItem[]> {
  const r = await ListTaxesUseCase.execute();
  return r.success ? r.taxes : [];
}

export async function createTaxAction(input: CreateTaxFormInput): Promise<CreateTaxResult> {
  const result = await CreateTaxUseCase.execute(input);
  if (result.success) {
    revalidateTaxesRoute();
  }
  return result;
}

export async function updateTaxAction(input: UpdateTaxFormInput): Promise<UpdateTaxResult> {
  const result = await UpdateTaxUseCase.execute(input);
  if (result.success) {
    revalidateTaxesRoute();
  }
  return result;
}

export async function updateTaxActiveAction(id: string, isActive: boolean): Promise<UpdateTaxResult> {
  const r = await TaxRequest.updatePartial(id, { isActive });
  if (r.success) {
    revalidateTaxesRoute();
  }
  return r;
}

export async function deleteTaxAction(id: string): Promise<DeleteTaxResult> {
  const result = await DeleteTaxUseCase.execute(id);
  if (result.success) {
    revalidateTaxesRoute();
  }
  return result;
}
