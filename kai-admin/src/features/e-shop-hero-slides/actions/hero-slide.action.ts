"use server";

import { revalidatePath } from "next/cache";
import { clampHeroSliderAutoplaySeconds } from "../constants/hero-slider.constants";
import { EShopHeroSlidesRequest } from "../infrastructure/eshop-hero-slides.request";
import type {
  CreateHeroSlideResult,
  DeleteHeroSlideResult,
  EShopHeroSlideCtaStyle,
  EShopHeroSlideTextAlign,
  ReorderHeroSlidesResult,
  UpdateHeroSlideResult,
} from "../types/hero-slide.types";

const PATH = "/e-shop/hero-slides";

export async function listHeroSlidesAction() {
  return EShopHeroSlidesRequest.list();
}

export async function createHeroSlideAction(input: {
  title?: string | null;
  subtitle?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  ctaStyle?: EShopHeroSlideCtaStyle;
  isActive?: boolean;
  sortOrder?: number;
  textAlign?: EShopHeroSlideTextAlign;
  overlayOpacity?: number;
  textColor?: string | null;
}): Promise<CreateHeroSlideResult> {
  const result = await EShopHeroSlidesRequest.create({
    title: input.title ?? null,
    subtitle: input.subtitle ?? null,
    ctaLabel: input.ctaLabel ?? null,
    ctaHref: input.ctaHref ?? null,
    ctaStyle: input.ctaStyle ?? "none",
    isActive: input.isActive !== false,
    ...(input.sortOrder != null && input.sortOrder >= 1
      ? { sortOrder: input.sortOrder }
      : {}),
    textAlign: input.textAlign ?? "left",
    overlayOpacity: input.overlayOpacity ?? 45,
    textColor: input.textColor ?? null,
  });
  if (result.success) {
    revalidatePath(PATH);
  }
  return result;
}

export async function updateHeroSlideAction(input: {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  ctaStyle?: EShopHeroSlideCtaStyle;
  isActive?: boolean;
  sortOrder?: number;
  textAlign?: EShopHeroSlideTextAlign;
  overlayOpacity?: number;
  textColor?: string | null;
}): Promise<UpdateHeroSlideResult> {
  const { id, ...body } = input;
  const result = await EShopHeroSlidesRequest.update(id, body);
  if (result.success) {
    revalidatePath(PATH);
  }
  return result;
}

export async function deleteHeroSlideAction(id: string): Promise<DeleteHeroSlideResult> {
  const result = await EShopHeroSlidesRequest.remove(id);
  if (result.success) {
    revalidatePath(PATH);
  }
  return result;
}

export async function reorderHeroSlidesAction(
  orderedIds: string[],
): Promise<ReorderHeroSlidesResult> {
  const result = await EShopHeroSlidesRequest.reorderOrder(orderedIds);
  if (result.success) {
    revalidatePath(PATH);
  }
  return result;
}

export async function getHeroSliderSettingsAction() {
  return EShopHeroSlidesRequest.getSliderSettings();
}

export async function updateHeroSliderAutoplayAction(autoplaySeconds: number) {
  const result = await EShopHeroSlidesRequest.updateSliderSettings({
    autoplaySeconds: clampHeroSliderAutoplaySeconds(autoplaySeconds),
  });
  if (result.success) {
    revalidatePath(PATH);
  }
  return result;
}
