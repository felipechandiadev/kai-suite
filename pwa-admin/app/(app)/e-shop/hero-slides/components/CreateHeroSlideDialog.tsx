"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import { Switch } from "@kai/ui";
import type { EShopHeroSlideCtaStyle, EShopHeroSlideTextAlign } from "@/features/e-shop-hero-slides/types/hero-slide.types";
import {
  createHeroSlideAction,
  deleteHeroSlideAction,
  getHeroSliderSettingsAction,
  updateHeroSlideAction,
  updateHeroSliderAutoplayAction,
} from "@/features/e-shop-hero-slides/actions/hero-slide.action";
import { HERO_SLIDER_AUTOPLAY_DEFAULT_SECONDS } from "@/features/e-shop-hero-slides/constants/hero-slider.constants";
import { EntityMultimediaPanel } from "../../../catalog/products/ui/EntityMultimediaPanel";
import { HeroSlideAutoplayField } from "./HeroSlideAutoplayField";
import { HeroSlideFormFields } from "./HeroSlideFormFields";

export type CreateHeroSlideDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
};

export function CreateHeroSlideDialog({ open, onClose, onSuccess }: CreateHeroSlideDialogProps) {
  const router = useRouter();
  const finalizedRef = useRef(false);
  const draftIdRef = useRef<string | null>(null);
  const [draftSlideId, setDraftSlideId] = useState<string | null>(null);
  const [draftPreparing, setDraftPreparing] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [ctaStyle, setCtaStyle] = useState<EShopHeroSlideCtaStyle>("none");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [textAlign, setTextAlign] = useState<EShopHeroSlideTextAlign>("left");
  const [overlayOpacity, setOverlayOpacity] = useState("45");
  const [textColor, setTextColor] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [autoplaySeconds, setAutoplaySeconds] = useState(HERO_SLIDER_AUTOPLAY_DEFAULT_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const cleanupDraft = async (slideId: string | null) => {
    if (slideId && !finalizedRef.current) {
      await deleteHeroSlideAction(slideId);
    }
  };

  useEffect(() => {
    if (!open) return;

    finalizedRef.current = false;
    draftIdRef.current = null;
    setDraftSlideId(null);
    setTitle("");
    setMessage("");
    setCtaStyle("none");
    setCtaLabel("");
    setCtaHref("");
    setTextAlign("left");
    setOverlayOpacity("45");
    setTextColor(null);
    setIsActive(true);
    setAutoplaySeconds(HERO_SLIDER_AUTOPLAY_DEFAULT_SECONDS);
    setError(null);
    setDraftPreparing(true);

    void getHeroSliderSettingsAction().then((r) => {
      if (r.success) setAutoplaySeconds(r.autoplaySeconds);
    });

    let cancelled = false;
    void (async () => {
      const r = await createHeroSlideAction({ isActive: false });
      if (cancelled) {
        if (r.success) await deleteHeroSlideAction(r.slide.id);
        return;
      }
      if (r.success) {
        draftIdRef.current = r.slide.id;
        setDraftSlideId(r.slide.id);
      } else {
        setError(r.error);
      }
      setDraftPreparing(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleClose = () => {
    const slideId = draftIdRef.current;
    draftIdRef.current = null;
    setDraftSlideId(null);
    setError(null);
    onClose();
    void cleanupDraft(slideId);
  };

  const handleSubmit = () => {
    if (!draftSlideId) {
      setError("No se pudo preparar el slide. Cierra el diálogo e inténtalo de nuevo.");
      return;
    }
    setError(null);
    startTransition(() => {
      void (async () => {
        const settingsResult = await updateHeroSliderAutoplayAction(autoplaySeconds);
        if (!settingsResult.success) {
          setError(settingsResult.error);
          return;
        }
        const r = await updateHeroSlideAction({
          id: draftSlideId,
          title: title.trim() || null,
          subtitle: message.trim() || null,
          ctaStyle,
          ctaLabel: ctaStyle === "none" ? null : ctaLabel.trim() || null,
          ctaHref: ctaStyle === "none" ? null : ctaHref.trim() || null,
          isActive,
          textAlign,
          overlayOpacity: Number(overlayOpacity) || 0,
          textColor,
        });
        if (r.success) {
          finalizedRef.current = true;
          draftIdRef.current = null;
          await onSuccess?.();
          await router.refresh();
          setError(null);
          onClose();
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
      title="Crear slide del hero"
      size="lg"
      scroll="paper"
      maxHeight="min(92vh, 720px)"
      data-test-id="hero-slide-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="hero-slide-create-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={isPending || draftPreparing || !draftSlideId}
          >
            {isPending ? "Creando…" : draftPreparing ? "Preparando…" : "Crear"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configura título, mensaje, acción e imagen de fondo. Puedes subir la multimedia antes de guardar.
        </p>
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
          textAlign={textAlign}
          onTextAlignChange={setTextAlign}
          overlayOpacity={overlayOpacity}
          onOverlayOpacityChange={setOverlayOpacity}
          textColor={textColor}
          onTextColorChange={setTextColor}
          showAdvanced={false}
        />
        <HeroSlideAutoplayField
          value={autoplaySeconds}
          onChange={setAutoplaySeconds}
          disabled={isPending || draftPreparing}
        />
        <Switch checked={isActive} onChange={setIsActive} label="Activo en la tienda" labelPosition="right" />
        {draftPreparing ? (
          <p className="text-sm text-muted-foreground" data-test-id="hero-slide-create-draft-loading">
            Preparando subida de imágenes…
          </p>
        ) : null}
        {draftSlideId ? (
          <EntityMultimediaPanel
            entityType="e-shop-hero-slide"
            entityId={draftSlideId}
            title="Imagen de fondo"
            collectionOnly
            disabled={draftPreparing || isPending}
            onChanged={() => router.refresh()}
          />
        ) : null}
      </div>
    </Dialog>
  );
}
