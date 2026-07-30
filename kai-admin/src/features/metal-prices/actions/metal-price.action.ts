"use server";

import { revalidatePath } from "next/cache";
import { CreateMetalPriceUseCase } from "../application/create-metal-price.usecase";
import { DeleteMetalPriceUseCase } from "../application/delete-metal-price.usecase";
import { ListMetalPricesUseCase } from "../application/list-metal-prices.usecase";
import { UpdateMetalPriceUseCase } from "../application/update-metal-price.usecase";
import type {
  CreateMetalPriceFormInput,
  UpdateMetalPriceFormInput,
} from "../domain/metal-price.entity";
import type {
  CreateMetalPriceResult,
  DeleteMetalPriceResult,
  MetalPriceRow,
  UpdateMetalPriceResult,
} from "../types/metal-price.types";

const PATH = "/settings/metal-prices";

function revalidateMetalPricesRoute() {
  revalidatePath(PATH, "page");
}

export async function listMetalPricesForPage(): Promise<MetalPriceRow[]> {
  const r = await ListMetalPricesUseCase.execute();
  return r.success ? r.rows : [];
}

export async function createMetalPriceAction(
  input: CreateMetalPriceFormInput,
): Promise<CreateMetalPriceResult> {
  const result = await CreateMetalPriceUseCase.execute(input);
  if (result.success) {
    revalidateMetalPricesRoute();
  }
  return result;
}

export async function updateMetalPriceAction(
  input: UpdateMetalPriceFormInput,
): Promise<UpdateMetalPriceResult> {
  const result = await UpdateMetalPriceUseCase.execute(input);
  if (result.success) {
    revalidateMetalPricesRoute();
  }
  return result;
}

export async function deleteMetalPriceAction(id: string): Promise<DeleteMetalPriceResult> {
  const result = await DeleteMetalPriceUseCase.execute({ id });
  if (result.success) {
    revalidateMetalPricesRoute();
  }
  return result;
}
