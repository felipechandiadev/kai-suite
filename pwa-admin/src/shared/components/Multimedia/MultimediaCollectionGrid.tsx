"use client";

import { useMemo, useState } from "react";
import { IconButton } from "@kai/ui";
import type { MultimediaAspectRatio, MultimediaGridItem, MultimediaLightboxItem } from "./types";
import { MultimediaLightbox } from "./MultimediaLightbox";
import { resolvePreviewSurface } from "./multimedia-preview-surface";

function aspectClass(ratio: MultimediaAspectRatio): string {
  if (ratio === "square") {
    return "aspect-square";
  }
  if (ratio === "auto") {
    return "h-40 sm:h-48";
  }
  return "aspect-video";
}

function isVideoMime(mimeType: string, kind?: string): boolean {
  return mimeType.startsWith("video/") || kind === "video";
}

export type MultimediaCollectionGridProps = {
  items: MultimediaGridItem[];
  aspectRatio?: MultimediaAspectRatio;
  allowPrimary?: boolean;
  enableGallery?: boolean;
  disabled?: boolean;
  busy?: boolean;
  onRemove?: (item: MultimediaGridItem, index: number) => void;
  onSetPrimary?: (item: MultimediaGridItem, index: number) => void;
  /** Reorden local (staging) o tras API (persisted). */
  onReorder?: (fromIndex: number, toIndex: number) => void;
  allowReorder?: boolean;
  /** Fondo del área de vista previa (hex, rgb, var). */
  previewBackgroundColor?: string;
  "data-test-id"?: string;
};

export function MultimediaCollectionGrid({
  items,
  aspectRatio = "16:9",
  allowPrimary = false,
  enableGallery = true,
  disabled = false,
  busy = false,
  onRemove,
  onSetPrimary,
  onReorder,
  allowReorder = false,
  previewBackgroundColor,
  "data-test-id": testId = "multimedia-collection-grid",
}: MultimediaCollectionGridProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const previewSurface = resolvePreviewSurface(previewBackgroundColor);
  const imageObjectClass = previewSurface.omitDefaultBg ? "object-contain" : "object-cover";

  const lightboxItems: MultimediaLightboxItem[] = useMemo(
    () =>
      items.map((item) => {
        if (item.kind === "persisted") {
          return {
            url: item.asset.publicUrl,
            mimeType: item.asset.mimeType,
            kind: item.asset.kind,
          };
        }
        return {
          url: item.staging.previewUrl,
          mimeType: item.staging.file.type,
          kind: item.staging.file.type.startsWith("video/") ? "video" : "image",
        };
      }),
    [items],
  );

  const openGalleryAt = (index: number) => {
    if (!enableGallery || lightboxItems.length === 0) {
      return;
    }
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleDragStart = (index: number) => {
    if (!allowReorder || disabled || busy) {
      return;
    }
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!allowReorder || dragIndex === null || dragIndex === index) {
      return;
    }
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== toIndex && onReorder) {
      onReorder(dragIndex, toIndex);
    }
    setDragIndex(null);
  };

  if (items.length === 0) {
    return null;
  }

  const thumbMediaClass = `h-full w-full rounded-lg ${imageObjectClass}`;
  const thumbFrameClass = `w-full max-w-[180px] overflow-hidden rounded-lg shadow ${aspectClass(aspectRatio)} ${
    previewSurface.omitDefaultBg ? "flex items-center justify-center" : "bg-muted/25"
  }`;

  return (
    <>
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        data-test-id={testId}
      >
        {items.map((item, index) => {
          const isPersisted = item.kind === "persisted";
          const url = isPersisted ? item.asset.publicUrl : item.staging.previewUrl;
          const mimeType = isPersisted ? item.asset.mimeType : item.staging.file.type;
          const kind = isPersisted ? item.asset.kind : undefined;
          const isVideo = isVideoMime(mimeType, kind);
          const isPrimary = isPersisted
            ? item.asset.isPrimary === true
            : item.staging.isPrimary === true;
          const cellKey = isPersisted ? item.asset.id : item.staging.clientId;

          return (
            <div
              key={cellKey}
              className={`relative inline-block w-full max-w-[180px] ${
                isPrimary ? "rounded-lg ring-2 ring-primary ring-offset-2" : ""
              } ${allowReorder ? "cursor-grab active:cursor-grabbing" : ""}`}
              draggable={allowReorder && !disabled && !busy}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              data-test-id={`${testId}-cell-${cellKey}`}
            >
              <button
                type="button"
                className="block w-full cursor-pointer border-0 bg-transparent p-0 text-left"
                disabled={!enableGallery}
                onClick={() => openGalleryAt(index)}
                aria-label="Ver en tamaño completo"
              >
                <div className={thumbFrameClass} style={previewSurface.style}>
                  {isVideo ? (
                    <video
                      src={url}
                      className={thumbMediaClass}
                      muted
                      playsInline
                      controls={false}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className={thumbMediaClass} loading="lazy" />
                  )}
                </div>
              </button>

              <div className="absolute bottom-2 right-2 flex gap-1">
                {allowPrimary ? (
                  <IconButton
                    icon="Star"
                    variant="action"
                    size="sm"
                    className={`!rounded-md !border !border-neutral-200/90 !bg-white !shadow-md backdrop-blur-sm ${
                      isPrimary ? "!text-primary" : "text-muted-foreground"
                    }`}
                    iconClassName={isPrimary ? "fill-current" : "fill-none"}
                    ariaLabel={isPrimary ? "Imagen principal" : "Marcar como principal"}
                    title={isPrimary ? "Imagen principal" : "Marcar como principal"}
                    disabled={disabled || busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetPrimary?.(item, index);
                    }}
                    data-test-id={`${testId}-primary-${cellKey}`}
                  />
                ) : null}
                {onRemove ? (
                  <IconButton
                    icon="Trash2"
                    variant="action"
                    size="sm"
                    className="!rounded-md !border !border-neutral-200/90 !bg-white text-destructive !shadow-md backdrop-blur-sm hover:!bg-neutral-100"
                    ariaLabel="Quitar"
                    title="Quitar"
                    disabled={disabled || busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(item, index);
                    }}
                    data-test-id={`${testId}-remove-${cellKey}`}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <MultimediaLightbox
        open={lightboxOpen}
        items={lightboxItems}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
