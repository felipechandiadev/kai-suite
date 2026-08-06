"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { Switch } from "@kai/ui";
import type {
  MenuHeroSlideCtaStyle,
  MenuHeroSlideRow,
  MenuHeroSlideTextAlign,
} from "@/features/menu-hero-slides/types/hero-slide.types";
import {
  getHeroSliderSettingsAction,
  updateHeroSlideAction,
  updateHeroSliderAutoplayAction,
} from "@/features/menu-hero-slides/actions/hero-slide.action";
import { HERO_SLIDER_AUTOPLAY_DEFAULT_SECONDS } from "@/features/menu-hero-slides/constants/hero-slider.constants";
import { EntityMultimediaPanel } from "../../../../catalog/products/ui/EntityMultimediaPanel";
import { HeroSlideAutoplayField } from "./HeroSlideAutoplayField";
import { HeroSlideFormFields } from "./HeroSlideFormFields";

function resolveCtaStyle(slide: MenuHeroSlideRow): MenuHeroSlideCtaStyle {
  if (slide.ctaStyle === "button" || slide.ctaStyle === "link" || slide.ctaStyle === "none") {
    return slide.ctaStyle;
  }
  return slide.ctaLabel?.trim() ? "button" : "none";
}

export type UpdateHeroSlideDialogProps = {
  open: boolean;
  onClose: () => void;
  slide: MenuHeroSlideRow;
  onSuccess?: () => void | Promise<void>;
};

export function UpdateHeroSlideDialog({ open, onClose, slide, onSuccess }: UpdateHeroSlideDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [ctaStyle, setCtaStyle] = useState<MenuHeroSlideCtaStyle>("none");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [textAlign, setTextAlign] = useState<MenuHeroSlideTextAlign>("left");
  const [overlayOpacity, setOverlayOpacity] = useState("45");
  const [textColor, setTextColor] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [autoplaySeconds, setAutoplaySeconds] = useState(HERO_SLIDER_AUTOPLAY_DEFAULT_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setTitle(slide.title ?? "");
    setMessage(slide.subtitle ?? "");
    setCtaStyle(resolveCtaStyle(slide));
    setCtaLabel(slide.ctaLabel ?? "");
    setCtaHref(slide.ctaHref ?? "");
    setSortOrder(String(slide.sortOrder >= 1 ? slide.sortOrder : 1));
    setTextAlign(slide.textAlign ?? "left");
    setOverlayOpacity(String(slide.overlayOpacity ?? 45));
    setTextColor(slide.textColor ?? null);
    setIsActive(slide.isActive !== false);
    setAutoplaySeconds(HERO_SLIDER_AUTOPLAY_DEFAULT_SECONDS);
    setError(null);
    void getHeroSliderSettingsAction().then((r) => {
      if (r.success) setAutoplaySeconds(r.autoplaySeconds);
    });
  }, [open, slide.id]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const settingsResult = await updateHeroSliderAutoplayAction(autoplaySeconds);
        if (!settingsResult.success) {
          setError(settingsResult.error);
          return;
        }
        const r = await updateHeroSlideAction({
          id: slide.id,
          title: title.trim() || null,
          subtitle: message.trim() || null,
          ctaStyle,
          ctaLabel: ctaStyle === "none" ? null : ctaLabel.trim() || null,
          ctaHref: ctaStyle === "none" ? null : ctaHref.trim() || null,
          sortOrder: Math.max(1, Number(sortOrder) || 1),
          textAlign,
          overlayOpacity: Number(overlayOpacity) || 0,
          textColor,
          isActive,
        });
        if (r.success) {
          await onSuccess?.();
          await router.refresh();
          handleClose();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Editar slide del hero"
      size="lg"
      scroll="paper"
      maxHeight="min(92vh, 720px)"
      data-test-id="hero-slide-update-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="hero-slide-update-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <HeroSlideFormFields
          title={title}
          onTitleChange={setTitle}
          message={message}
          onMessageChange={setMessage}
          ctaStyle={ctaStyle}
          onCtaStyleChange={setCtaStyle}
          ctaLabel={ctaLabel}
          onCtaLabelChange={setCtaLabel}
          ctaHref={ctaHref}
          onCtaHrefChange={setCtaHref}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          textAlign={textAlign}
          onTextAlignChange={setTextAlign}
          overlayOpacity={overlayOpacity}
          onOverlayOpacityChange={setOverlayOpacity}
          textColor={textColor}
          onTextColorChange={setTextColor}
        />
        <HeroSlideAutoplayField
          value={autoplaySeconds}
          onChange={setAutoplaySeconds}
          disabled={isPending}
        />
        <Switch checked={isActive} onChange={setIsActive} label="Activo en la carta" labelPosition="right" />
        <EntityMultimediaPanel
          entityType="menu-hero-slide"
          entityId={slide.id}
          title="Imagen de fondo"
          collectionOnly
          onChanged={() => router.refresh()}
        />
      </div>
    </Dialog>
  );
}
