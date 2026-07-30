"use server";

import { revalidatePath } from "next/cache";
import { ListStoragesUseCase } from "../application/list-storages.usecase";
import { CreateStorageUseCase } from "../application/create-storage.usecase";
import { UpdateStorageUseCase } from "../application/update-storage.usecase";
import { DeleteStorageUseCase } from "../application/delete-storage.usecase";
import { StorageRequest } from "../infrastructure/storage.request";
import type { CreateStorageFormInput, UpdateStorageFormInput } from "../domain/storage.entity";
import type {
  CreateStorageResult,
  DeleteStorageResult,
  StorageListItem,
  UpdateStorageResult,
} from "../types/storage.types";

const PATH = "/inventory/storages";

function revalidateStoragesRoute() {
  revalidatePath(PATH, "page");
}

export async function listStoragesForPage(): Promise<StorageListItem[]> {
  const r = await ListStoragesUseCase.execute();
  return r.success ? r.storages : [];
}

export async function getStorageDetailAction(
  id: string,
): Promise<{ success: true; storage: StorageListItem } | { success: false; error: string }> {
  return StorageRequest.findById(id);
}

export async function createStorageAction(input: CreateStorageFormInput): Promise<CreateStorageResult> {
  const result = await CreateStorageUseCase.execute(input);
  if (result.success) {
    revalidateStoragesRoute();
  }
  return result;
}

export async function updateStorageAction(input: UpdateStorageFormInput): Promise<UpdateStorageResult> {
  const result = await UpdateStorageUseCase.execute(input);
  if (result.success) {
    revalidateStoragesRoute();
  }
  return result;
}

export async function updateStorageActiveAction(
  id: string,
  isActive: boolean,
): Promise<UpdateStorageResult> {
  const r = await StorageRequest.updatePartial(id, { isActive });
  if (r.success) {
    revalidateStoragesRoute();
  }
  return r;
}

export async function deleteStorageAction(id: string): Promise<DeleteStorageResult> {
  const result = await DeleteStorageUseCase.execute(id);
  if (result.success) {
    revalidateStoragesRoute();
  }
  return result;
}
