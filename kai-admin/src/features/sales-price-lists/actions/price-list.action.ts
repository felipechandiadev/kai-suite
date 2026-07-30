"use server";

import { revalidatePath } from "next/cache";
import { ListPriceListsUseCase } from "../application/list-price-lists.usecase";
import { CreatePriceListUseCase } from "../application/create-price-list.usecase";
import { UpdatePriceListUseCase } from "../application/update-price-list.usecase";
import { DeletePriceListUseCase } from "../application/delete-price-list.usecase";
import type { CreatePriceListFormInput, UpdatePriceListFormInput } from "../domain/price-list.entity";
import type {
  CreatePriceListResult,
  DeletePriceListResult,
  PriceListListItem,
  UpdatePriceListResult,
} from "../types/price-list.types";

const PATH = "/sales/price-lists";

function revalidate() {
  revalidatePath(PATH, "page");
}

export async function listPriceListsForPage(): Promise<PriceListListItem[]> {
  const r = await ListPriceListsUseCase.execute();
  return r.success ? r.priceLists : [];
}

export async function createPriceListAction(
  input: CreatePriceListFormInput,
): Promise<CreatePriceListResult> {
  const result = await CreatePriceListUseCase.execute(input);
  if (result.success) {
    revalidate();
  }
  return result;
}

export async function updatePriceListAction(
  input: UpdatePriceListFormInput,
): Promise<UpdatePriceListResult> {
  const result = await UpdatePriceListUseCase.execute(input);
  if (result.success) {
    revalidate();
  }
  return result;
}

export async function deletePriceListAction(id: string): Promise<DeletePriceListResult> {
  const result = await DeletePriceListUseCase.execute(id);
  if (result.success) {
    revalidate();
  }
  return result;
}
