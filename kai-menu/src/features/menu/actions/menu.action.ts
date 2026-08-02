"use server";

import {
  fetchMenuCatalog,
  fetchMenuCategories,
  fetchMenuProduct,
  fetchMenuStorefront,
} from "../infrastructure/menu.request";

export async function fetchMenuStorefrontAction() {
  return fetchMenuStorefront();
}

export async function fetchMenuCategoriesAction() {
  return fetchMenuCategories();
}

export async function fetchMenuCatalogAction(input?: {
  search?: string;
  categoryIds?: string[];
}) {
  return fetchMenuCatalog(input?.search, input?.categoryIds);
}

export async function fetchMenuProductAction(productId: string) {
  return fetchMenuProduct(productId);
}
