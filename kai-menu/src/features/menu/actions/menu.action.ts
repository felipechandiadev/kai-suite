"use server";

import {
  fetchMenuCatalog,
  fetchMenuCategories,
  fetchMenuProduct,
  fetchMenuStorefront,
} from "../infrastructure/menu.request";

/** Carga inicial / refresh de la home en un solo Server Action (evita Promise.all de actions en el cliente). */
export async function loadMenuHomeAction(input?: {
  search?: string;
  categoryIds?: string[];
}) {
  const [store, categories, catalog] = await Promise.all([
    fetchMenuStorefront(),
    fetchMenuCategories(),
    fetchMenuCatalog(input?.search, input?.categoryIds),
  ]);
  return {
    store,
    categories,
    items: catalog?.items ?? [],
  };
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
