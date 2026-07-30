"use server";

import { revalidatePath } from "next/cache";
import { PromotionsRequest } from "../infrastructure/promotions.request";
import type {
  CreatePromotionInput,
  UpdatePromotionInput,
} from "../types/promotion.types";

const ADMIN_PATH = "/sales/promotions";

export async function listPromotionsAction(
  filters: Record<string, string | undefined> = {},
) {
  return PromotionsRequest.list(filters);
}

export async function getPromotionAction(id: string) {
  return PromotionsRequest.get(id);
}

export async function createPromotionAction(body: CreatePromotionInput) {
  const res = await PromotionsRequest.create(body);
  if (res.success) revalidatePath(ADMIN_PATH);
  return res;
}

export async function updatePromotionAction(
  id: string,
  body: UpdatePromotionInput,
) {
  const res = await PromotionsRequest.update(id, body);
  if (res.success) revalidatePath(ADMIN_PATH);
  return res;
}

export async function togglePromotionActiveAction(id: string, isActive: boolean) {
  const res = await PromotionsRequest.toggleActive(id, isActive);
  if (res.success) revalidatePath(ADMIN_PATH);
  return res;
}

export async function deletePromotionAction(id: string) {
  const res = await PromotionsRequest.remove(id);
  if (res.success) revalidatePath(ADMIN_PATH);
  return res;
}
