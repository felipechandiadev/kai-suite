"use server";

import { revalidatePath } from "next/cache";
import { BrandRequest } from "../infrastructure/brand.request";
import type {
  BrandListItem,
  CreateBrandResult,
  DeleteBrandResult,
  UpdateBrandResult,
} from "../types/brand.types";

const PATH = "/catalog/brands";
const PRODUCTS_PATH = "/catalog/products";

function revalidateBrandsRoute() {
  revalidatePath(PATH, "page");
}

function revalidateProductsUsingBrands() {
  revalidatePath(PRODUCTS_PATH, "page");
}

export async function listBrandsForPage(): Promise<BrandListItem[]> {
  const r = await BrandRequest.findAll(true);
  return r.success ? r.brands : [];
}

export async function createBrandAction(input: {
  name: string;
  description?: string | null;
  isActive?: boolean;
}): Promise<CreateBrandResult> {
  const result = await BrandRequest.create(input);
  if (result.success) {
    revalidateBrandsRoute();
  }
  return result;
}

export async function updateBrandAction(input: {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}): Promise<UpdateBrandResult> {
  const result = await BrandRequest.update(input.id, {
    name: input.name,
    description: input.description,
    isActive: input.isActive,
  });
  if (result.success) {
    revalidateBrandsRoute();
    revalidateProductsUsingBrands();
  }
  return result;
}

export async function deleteBrandAction(id: string): Promise<DeleteBrandResult> {
  const result = await BrandRequest.remove(id);
  if (result.success) {
    revalidateBrandsRoute();
    revalidateProductsUsingBrands();
  }
  return result;
}
