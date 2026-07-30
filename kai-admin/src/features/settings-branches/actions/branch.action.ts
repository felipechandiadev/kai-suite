"use server";

import { revalidatePath } from "next/cache";
import { ListBranchesUseCase } from "../application/list-branches.usecase";
import { CreateBranchUseCase } from "../application/create-branch.usecase";
import { UpdateBranchUseCase } from "../application/update-branch.usecase";
import { DeleteBranchUseCase } from "../application/delete-branch.usecase";
import type { BranchListItem } from "../types/branch.types";
import type { CreateBranchFormInput, UpdateBranchFormInput } from "../domain/branch.entity";
import type { CreateBranchResult, DeleteBranchResult, UpdateBranchResult } from "../types/branch.types";

const BRANCHES_PATH = "/settings/branches";

function revalidateBranchesRoute() {
  revalidatePath(BRANCHES_PATH, "page");
}

/** Datos iniciales para la página (RSC o para hidratar el `CollectionPageLayout` en el cliente). */
export async function listBranchesForSettingsPage(): Promise<BranchListItem[]> {
  const list = await ListBranchesUseCase.execute();
  return list.success ? list.branches : [];
}

export async function createBranchAction(input: CreateBranchFormInput): Promise<CreateBranchResult> {
  const result = await CreateBranchUseCase.execute(input);
  if (result.success) {
    revalidateBranchesRoute();
  }
  return result;
}

export async function updateBranchAction(input: UpdateBranchFormInput): Promise<UpdateBranchResult> {
  const result = await UpdateBranchUseCase.execute(input);
  if (result.success) {
    revalidateBranchesRoute();
  }
  return result;
}

export async function deleteBranchAction(id: string): Promise<DeleteBranchResult> {
  const result = await DeleteBranchUseCase.execute(id);
  if (result.success) {
    revalidateBranchesRoute();
  }
  return result;
}
