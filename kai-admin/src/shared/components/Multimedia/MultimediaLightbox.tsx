"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog } from "@kai/ui";
import { IconButton } from "@kai/ui";
import type { MultimediaLightboxItem } from "./types";

export type MultimediaLightboxProps = {
  open: boolean;
  items: MultimediaLightboxItem[];
  initialIndex?: number;
  onClose: () => void;
  /** Título fijo del diálogo (tiene prioridad sobre `titleBase`). */
  title?: string;
  /** Prefijo del título; si hay varias imágenes se añade "(n/m)" al navegar. */
  titleBase?: string;
};

function isVideoItem(item: MultimediaLightboxItem): boolean {
  return item.mimeType.startsWith("video/") || item.kind === "video";
}

export function MultimediaLightbox({
  open,
  items,
  initialIndex = 0,
  onClose,
  title,
  titleBase,
}: MultimediaLightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) {
      setIndex(Math.min(Math.max(0, initialIndex), Math.max(0, items.length - 1)));
    }
  }, [open, initialIndex, items.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
  }, [items.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i >= items.length - 1 ? 0 : i + 1));
  }, [items.length]);

  useEffect(() => {
    if (!open || items.length <= 1) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goPrev();
      } else if (e.key === "ArrowRight") {
        goNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items.length, goPrev, goNext]);

  if (items.length === 0) {
    return null;
  }

  const current = items[index] ?? items[0];
  const showNav = items.length > 1;
  const mediaKind = isVideoItem(current) ? "Video" : "Imagen";
  const baseTitle = title?.trim() || titleBase?.trim();
  const dialogTitle = baseTitle
    ? showNav
      ? `${baseTitle} (${index + 1}/${items.length})`
      : baseTitle
    : showNav
      ? `${mediaKind} ${index + 1} de ${items.length}`
      : mediaKind;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={dialogTitle}
      size="xl"
      scroll="body"
      maxHeight="95vh"
      hideActions
      showCloseButton
      closeButtonText="Cerrar"
      className="multimedia-lightbox-dialog"
      data-test-id="multimedia-lightbox"
    >
      <div className="relative flex min-h-[50vh] w-full items-center justify-center">
        {showNav ? (
          <IconButton
            icon="ChevronLeft"
            variant="action"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 !bg-white/90"
            ariaLabel="Imagen anterior"
            onClick={goPrev}
            data-test-id="multimedia-lightbox-prev"
          />
        ) : null}

        <div className="max-h-[80vh] max-w-full">
          {isVideoItem(current) ? (
            <video
              key={current.url}
              src={current.url}
              className="max-h-[80vh] max-w-full rounded-lg"
              controls
              autoPlay
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={current.url}
              src={current.url}
              alt=""
              className="max-h-[80vh] max-w-full rounded-lg object-contain"
            />
          )}
        </div>

        {showNav ? (
          <IconButton
            icon="ChevronRight"
            variant="action"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 !bg-white/90"
            ariaLabel="Imagen siguiente"
            onClick={goNext}
            data-test-id="multimedia-lightbox-next"
          />
        ) : null}
      </div>
    </Dialog>
  );
}
