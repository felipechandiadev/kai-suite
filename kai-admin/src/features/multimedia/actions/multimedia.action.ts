"use server";

import { revalidatePath } from "next/cache";
import { MultimediaRequest } from "../infrastructure/multimedia.request";
import type { MultimediaAssetListItem, MultimediaEntityType } from "../types/multimedia.types";
import { HCM_EMPLOYEES } from "@/navigation/hcm-routes";

const PRODUCTS_PATH = "/catalog/products";
const SETTINGS_COMPANY_PATH = "/settings/company";
const ESHOP_TESTIMONIALS_PATH = "/e-shop/testimonials";
const ESHOP_HERO_SLIDES_PATH = "/e-shop/hero-slides";
const MENU_HERO_SLIDES_PATH = "/kaifood/menu/hero";
const HR_EMPLOYEES_PATH = HCM_EMPLOYEES;

const ENTITY_TYPES: MultimediaEntityType[] = [
  "product",
  "product-variant",
  "company",
  "employee",
  "e-shop-hero-slide",
  "e-shop-testimonial",
  "menu-hero-slide",
  "brand",
];

export async function revalidateMultimediaCachesAction(
  entityType: MultimediaEntityType,
  entityId?: string,
): Promise<void> {
  revalidatePathsForEntityType(entityType, entityId);
}

function revalidatePathsForEntityType(
  entityType: MultimediaEntityType,
  entityId?: string,
) {
  if (entityType === "company") {
    revalidatePath(SETTINGS_COMPANY_PATH, "page");
    return;
  }
  if (entityType === "employee") {
    revalidatePath(HR_EMPLOYEES_PATH, "page");
    return;
  }
  if (entityType === "e-shop-testimonial") {
    revalidatePath(ESHOP_TESTIMONIALS_PATH, "page");
    return;
  }
  if (entityType === "e-shop-hero-slide") {
    revalidatePath(ESHOP_HERO_SLIDES_PATH, "page");
    return;
  }
  if (entityType === "menu-hero-slide") {
    revalidatePath(MENU_HERO_SLIDES_PATH, "page");
    return;
  }
  revalidatePath(PRODUCTS_PATH, "page");
  if (entityType === "product-variant" && entityId?.trim()) {
    revalidatePath(`/catalog/products/variants/${entityId.trim()}`, "page");
  }
}

export type ListMultimediaResult =
  | { success: true; assets: MultimediaAssetListItem[] }
  | { success: false; error: string };

export async function listMultimediaForEntityAction(
  entityType: MultimediaEntityType,
  entityId: string,
  attributeId?: string | null,
): Promise<ListMultimediaResult> {
  return MultimediaRequest.listByEntity(entityType, entityId, attributeId);
}

export async function uploadMultimediaForEntityAction(formData: FormData): Promise<
  { success: true; asset: MultimediaAssetListItem } | { success: false; error: string }
> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "Archivo requerido" };
  }
  const entityType = String(formData.get("entityType") ?? "").trim() as MultimediaEntityType;
  const entityId = String(formData.get("entityId") ?? "").trim();
  const isPrimary = formData.get("isPrimary") === "true" || formData.get("isPrimary") === "1";
  if (!ENTITY_TYPES.includes(entityType)) {
    return { success: false, error: "Tipo de entidad no válido" };
  }
  if (!entityId) {
    return { success: false, error: "Entidad no válida" };
  }
  const r = await MultimediaRequest.uploadForEntity({ file, entityType, entityId, isPrimary });
  if (r.success) {
    revalidatePathsForEntityType(entityType, entityId);
  }
  return r;
}

export async function setPrimaryMultimediaAssetAction(input: {
  entityType: MultimediaEntityType;
  entityId: string;
  assetId: string;
  attributeId?: string | null;
}): Promise<{ success: true } | { success: false; error: string }> {
  const r = await MultimediaRequest.setPrimaryForEntity({
    entityType: input.entityType,
    entityId: input.entityId.trim(),
    assetId: input.assetId.trim(),
    attributeId: input.attributeId,
  });
  if (r.success) {
    revalidatePathsForEntityType(input.entityType, input.entityId);
  }
  return r;
}

export async function reorderMultimediaAssetsAction(input: {
  entityType: MultimediaEntityType;
  entityId: string;
  assetIds: string[];
  attributeId?: string | null;
}): Promise<{ success: true } | { success: false; error: string }> {
  const r = await MultimediaRequest.reorderForEntity({
    entityType: input.entityType,
    entityId: input.entityId.trim(),
    assetIds: input.assetIds.map((id) => id.trim()).filter(Boolean),
    attributeId: input.attributeId,
  });
  if (r.success) {
    revalidatePathsForEntityType(input.entityType, input.entityId);
  }
  return r;
}

export async function unlinkMultimediaFromEntityAction(input: {
  assetId: string;
  entityType: MultimediaEntityType;
  entityId: string;
  usageType?: string;
  attributeId?: string | null;
}): Promise<{ success: true } | { success: false; error: string }> {
  const r = await MultimediaRequest.unlinkFromEntity({
    assetId: input.assetId,
    entityType: input.entityType,
    entityId: input.entityId,
    usageType: input.usageType,
    attributeId: input.attributeId,
  });
  if (r.success) {
    revalidatePathsForEntityType(input.entityType, input.entityId);
  }
  return r;
}
