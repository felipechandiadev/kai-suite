"use server";

import { revalidatePath } from "next/cache";
import { ListCategoriesUseCase } from "../application/list-categories.usecase";
import { CreateCategoryUseCase } from "../application/create-category.usecase";
import { UpdateCategoryUseCase } from "../application/update-category.usecase";
import { DeleteCategoryUseCase } from "../application/delete-category.usecase";
import { CategoryRequest } from "../infrastructure/category.request";
import type { CreateCategoryFormInput, UpdateCategoryFormInput } from "../domain/category.entity";
import type {
  CategoryDetail,
  CategoryListItem,
  CreateCategoryResult,
  DeleteCategoryResult,
  UpdateCategoryResult,
} from "../types/category.types";

const PATH = "/catalog/categories";

function revalidateCategoriesRoute() {
  revalidatePath(PATH, "page");
}

export async function listCategoriesForPage(): Promise<CategoryListItem[]> {
  const r = await ListCategoriesUseCase.execute();
  return r.success ? r.categories : [];
}

export async function getCategoryDetailAction(
  id: string,
): Promise<{ success: true; category: CategoryDetail } | { success: false; error: string }> {
  return CategoryRequest.findById(id);
}

export async function createCategoryAction(input: CreateCategoryFormInput): Promise<CreateCategoryResult> {
  const result = await CreateCategoryUseCase.execute(input);
  if (result.success) {
    revalidateCategoriesRoute();
  }
  return result;
}

export async function updateCategoryAction(input: UpdateCategoryFormInput): Promise<UpdateCategoryResult> {
  const result = await UpdateCategoryUseCase.execute(input);
  if (result.success) {
    revalidateCategoriesRoute();
  }
  return result;
}

export async function deleteCategoryAction(id: string): Promise<DeleteCategoryResult> {
  const result = await DeleteCategoryUseCase.execute(id);
  if (result.success) {
    revalidateCategoriesRoute();
  }
  return result;
}
