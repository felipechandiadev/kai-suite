"use server";

import { revalidatePath } from "next/cache";
import { clampHeroSliderAutoplaySeconds } from "../constants/hero-slider.constants";
import { MenuHeroSlidesRequest } from "../infrastructure/menu-hero-slides.request";
import type {
  CreateHeroSlideResult,
  DeleteHeroSlideResult,
  MenuHeroSlideCtaStyle,
  MenuHeroSlideTextAlign,
  ReorderHeroSlidesResult,
  UpdateHeroSlideResult,
} from "../types/hero-slide.types";

const PATH = "/kaifood/menu/hero";

export async function listHeroSlidesAction() {
  return MenuHeroSlidesRequest.list();
}

export async function createHeroSlideAction(input: {
  title?: string | null;
  subtitle?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  ctaStyle?: MenuHeroSlideCtaStyle;
  isActive?: boolean;
  sortOrder?: number;
  textAlign?: MenuHeroSlideTextAlign;
  overlayOpacity?: number;
  textColor?: string | null;
}): Promise<CreateHeroSlideResult> {
  const result = await MenuHeroSlidesRequest.create({
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
  ctaStyle?: MenuHeroSlideCtaStyle;
  isActive?: boolean;
  sortOrder?: number;
  textAlign?: MenuHeroSlideTextAlign;
  overlayOpacity?: number;
  textColor?: string | null;
}): Promise<UpdateHeroSlideResult> {
  const { id, ...body } = input;
  const result = await MenuHeroSlidesRequest.update(id, body);
  if (result.success) {
    revalidatePath(PATH);
  }
  return result;
}

export async function deleteHeroSlideAction(id: string): Promise<DeleteHeroSlideResult> {
  const result = await MenuHeroSlidesRequest.remove(id);
  if (result.success) {
    revalidatePath(PATH);
  }
  return result;
}

export async function reorderHeroSlidesAction(
  orderedIds: string[],
): Promise<ReorderHeroSlidesResult> {
  const result = await MenuHeroSlidesRequest.reorderOrder(orderedIds);
  if (result.success) {
    revalidatePath(PATH);
  }
  return result;
}

export async function getHeroSliderSettingsAction() {
  return MenuHeroSlidesRequest.getSliderSettings();
}

export async function updateHeroSliderAutoplayAction(autoplaySeconds: number) {
  const result = await MenuHeroSlidesRequest.updateSliderSettings({
    autoplaySeconds: clampHeroSliderAutoplaySeconds(autoplaySeconds),
  });
  if (result.success) {
    revalidatePath(PATH);
  }
  return result;
}
