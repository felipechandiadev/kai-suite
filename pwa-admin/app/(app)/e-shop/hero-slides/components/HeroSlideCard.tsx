"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical } from "lucide-react";
import { IconButton } from "@kai/ui";
import { DeleteDialog } from "@kai/ui";
import type { EShopHeroSlideRow } from "@/features/e-shop-hero-slides/types/hero-slide.types";
import { deleteHeroSlideAction } from "@/features/e-shop-hero-slides/actions/hero-slide.action";
import { getHeroSlideTextPresentation } from "@/features/e-shop-hero-slides/utils/hero-slide-text-presentation";
import { UpdateHeroSlideDialog } from "./UpdateHeroSlideDialog";
import { HeroSlidePreview } from "./HeroSlidePreview";

type HeroSlideCardProps = {
  slide: EShopHeroSlideRow;
  displayOrder: number;
  draggable?: boolean;
  isDragging?: boolean;
  isSavingOrder?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  "data-test-id"?: string;
};

export function HeroSlideCard({
  slide,
  displayOrder,
  draggable = false,
  isDragging = false,
  isSavingOrder = false,
  onDragStart,
  onDragOver,
  onDrop,
  "data-test-id": dataTestId,
}: HeroSlideCardProps) {
  const router = useRouter();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const titlePreview = slide.title?.trim() || "Sin título";
  const statusLabel = slide.isActive ? "Activo" : "Inactivo";
  const presentation = getHeroSlideTextPresentation(slide.textColor);

  return (
    <>
      <article
        className={`relative overflow-hidden rounded-xl border border-border eshop-hero-section-shadow ${
          draggable ? "cursor-grab active:cursor-grabbing" : ""
        } ${isDragging ? "opacity-60 ring-2 ring-primary/40" : ""}`}
        data-test-id={dataTestId}
        draggable={draggable && !isSavingOrder}
        onDragStart={(e) => {
          if (!draggable || isSavingOrder) return;
          onDragStart?.();
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => {
          if (!draggable) return;
        }}
        onDragOver={onDragOver}
        onDrop={(e) => {
          if (!draggable || isSavingOrder) return;
          e.preventDefault();
          onDrop?.();
        }}
      >
        <HeroSlidePreview slide={slide} />
        <div
          className={`pointer-events-none absolute left-3 top-3 z-20 rounded-md border px-2 py-1 text-xs font-medium backdrop-blur-sm ${
            presentation.usesCustomColor
              ? ""
              : "border-border bg-background/90 text-foreground shadow-sm"
          }`}
          style={presentation.statusBadgeStyle}
          data-test-id="hero-slide-card-status"
        >
          {statusLabel} · Orden {displayOrder}
        </div>
        {draggable ? (
          <div
            className={`pointer-events-none absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-md border backdrop-blur-sm ${
              presentation.usesCustomColor
                ? ""
                : "border-border bg-background/90 text-muted-foreground shadow-sm"
            }`}
            style={presentation.dragHandleStyle}
            aria-hidden
            data-test-id="hero-slide-card-drag-handle"
          >
            <GripVertical className="h-5 w-5" />
          </div>
        ) : null}
        <div
          className="absolute bottom-3 right-3 z-20 flex items-center gap-2"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <IconButton
            icon="Pencil"
            variant="action"
            size="md"
            ariaLabel="Editar slide"
            className="bg-background/95 shadow-sm backdrop-blur-sm"
            onClick={() => setUpdateOpen(true)}
            data-test-id="hero-slide-card-update"
          />
          <IconButton
            icon="Trash2"
            variant="action"
            size="md"
            ariaLabel="Eliminar slide"
            disabled={isDeleting}
            className="bg-background/95 shadow-sm backdrop-blur-sm"
            onClick={() => {
              setDeleteErrors([]);
              setDeleteOpen(true);
            }}
            data-test-id="hero-slide-card-delete"
          />
        </div>
      </article>
      <UpdateHeroSlideDialog
        key={slide.id}
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        slide={slide}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
      <DeleteDialog
        open={deleteOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteOpen(false);
            setDeleteErrors([]);
          }
        }}
        title="Eliminar slide"
        message={
          <>
            ¿Eliminar el slide <strong className="font-semibold">«{titlePreview}»</strong>?
          </>
        }
        errors={deleteErrors}
        isSubmitting={isDeleting}
        onConfirm={() => {
          setDeleteErrors([]);
          setIsDeleting(true);
          void (async () => {
            try {
              const r = await deleteHeroSlideAction(slide.id);
              if (r.success) {
                setDeleteOpen(false);
                await router.refresh();
              } else {
                setDeleteErrors([r.error]);
              }
            } finally {
              setIsDeleting(false);
            }
          })();
        }}
        data-test-id={`${dataTestId ?? "hero-slide-card"}-delete-dialog`}
      />
    </>
  );
}
