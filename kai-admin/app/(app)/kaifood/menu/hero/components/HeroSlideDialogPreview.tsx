"use client";

import { useMemo } from "react";
import type {
  MenuHeroSlideCtaStyle,
  MenuHeroSlideRow,
  MenuHeroSlideTextAlign,
} from "@/features/menu-hero-slides/types/hero-slide.types";
import { HeroSlidePreview } from "./HeroSlidePreview";

export type HeroSlideDialogPreviewProps = {
  title: string;
  message: string;
  ctaStyle: MenuHeroSlideCtaStyle;
  ctaLabel: string;
  ctaHref: string;
  textAlign: MenuHeroSlideTextAlign;
  overlayOpacity: string;
  textColor: string | null;
  imageUrl?: string | null;
};

export function HeroSlideDialogPreview({
  title,
  message,
  ctaStyle,
  ctaLabel,
  ctaHref,
  textAlign,
  overlayOpacity,
  textColor,
  imageUrl = null,
}: HeroSlideDialogPreviewProps) {
  const slide = useMemo((): MenuHeroSlideRow => {
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    const trimmedCtaLabel = ctaLabel.trim();
    const trimmedCtaHref = ctaHref.trim();

    return {
      id: "dialog-preview",
      title: trimmedTitle || null,
      subtitle: trimmedMessage || null,
      ctaStyle,
      ctaLabel: ctaStyle === "none" ? null : trimmedCtaLabel || null,
      ctaHref: ctaStyle === "none" ? null : trimmedCtaHref || null,
      textAlign,
      overlayOpacity: Number(overlayOpacity) || 0,
      textColor,
      imageUrl,
      isActive: true,
      sortOrder: 1,
    };
  }, [
    title,
    message,
    ctaStyle,
    ctaLabel,
    ctaHref,
    textAlign,
    overlayOpacity,
    textColor,
    imageUrl,
  ]);

  return (
    <section className="space-y-2 border-t border-border pt-4">
      <h3 className="text-sm font-semibold">Vista previa</h3>
      <p className="text-xs text-muted-foreground">
        Así se verá el slide en la carta antes de guardar.
      </p>
      <div className="overflow-hidden rounded-lg border border-border">
        <HeroSlidePreview slide={slide} />
      </div>
    </section>
  );
}
