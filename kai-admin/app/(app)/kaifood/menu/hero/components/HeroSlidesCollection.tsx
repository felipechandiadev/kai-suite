"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CollectionPageLayout } from "@kai/ui";
import type { MenuHeroSlideRow } from "@/features/menu-hero-slides/types/hero-slide.types";
import { reorderHeroSlidesAction } from "@/features/menu-hero-slides/actions/hero-slide.action";
import { HeroSlidesCollectionAddAction } from "./HeroSlidesCollectionAddAction";
import { HeroSlideCard } from "./HeroSlideCard";

type HeroSlidesCollectionProps = {
  initialSlides: MenuHeroSlideRow[];
};

function sortSlides(slides: MenuHeroSlideRow[]): MenuHeroSlideRow[] {
  return [...slides].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

function applyOrder(slides: MenuHeroSlideRow[], orderedIds: string[]): MenuHeroSlideRow[] {
  const byId = new Map(slides.map((s) => [s.id, s]));
  return orderedIds.map((id, index) => {
    const slide = byId.get(id);
    if (!slide) return null;
    return { ...slide, sortOrder: index + 1 };
  }).filter((s): s is MenuHeroSlideRow => s != null);
}

function displaySortOrder(slide: MenuHeroSlideRow, index: number): number {
  return slide.sortOrder >= 1 ? slide.sortOrder : index + 1;
}

export function HeroSlidesCollection({ initialSlides }: HeroSlidesCollectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();

  const sortedInitial = useMemo(() => sortSlides(initialSlides), [initialSlides]);
  const [slides, setSlides] = useState(sortedInitial);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const dragIdRef = useRef<string | null>(null);

  useEffect(() => {
    setSlides(sortedInitial);
  }, [sortedInitial]);

  const canReorder = !q && slides.length > 1;

  const filtered = useMemo(() => {
    if (!q) return slides;
    return slides.filter((s) => {
      const inTitle = (s.title ?? "").toLowerCase().includes(q);
      const inMessage = (s.subtitle ?? "").toLowerCase().includes(q);
      const inCta = (s.ctaLabel ?? "").toLowerCase().includes(q);
      return inTitle || inMessage || inCta;
    });
  }, [slides, q]);

  const persistOrder = async (orderedIds: string[]) => {
    setIsSavingOrder(true);
    try {
      const result = await reorderHeroSlidesAction(orderedIds);
      if (result.success) {
        setSlides(sortSlides(result.slides));
        await router.refresh();
      } else {
        setSlides(sortedInitial);
      }
    } catch {
      setSlides(sortedInitial);
    } finally {
      setIsSavingOrder(false);
      setDraggingId(null);
      dragIdRef.current = null;
    }
  };

  const onDragStart = (id: string) => {
    if (!canReorder || isSavingOrder) return;
    dragIdRef.current = id;
    setDraggingId(id);
  };

  const onDrop = (overId: string) => {
    const activeId = dragIdRef.current;
    dragIdRef.current = null;
    setDraggingId(null);
    if (!canReorder || isSavingOrder || !activeId || activeId === overId) return;

    const currentIds = slides.map((s) => s.id);
    const from = currentIds.indexOf(activeId);
    const to = currentIds.indexOf(overId);
    if (from < 0 || to < 0) return;

    const nextIds = currentIds.slice();
    nextIds.splice(from, 1);
    nextIds.splice(to, 0, activeId);

    setSlides(applyOrder(slides, nextIds));
    void persistOrder(nextIds);
  };

  return (
    <CollectionPageLayout
      subtitle={
        canReorder
          ? "Arrastra desde el icono superior derecho para cambiar el orden. Edita o elimina desde la esquina inferior derecha."
          : "Cada fila es la vista previa del slide. Edita o elimina desde la esquina inferior derecha."
      }
      addAction={<HeroSlidesCollectionAddAction />}
      showSearch
      searchParamName="search"
      searchLabel="Buscar"
      searchPlaceholder="Buscar por título, mensaje o acción…"
      contentEmptyMessage="No hay slides del hero. Crea uno con el botón +."
      contentItems={
        filtered.length > 0
          ? filtered.map((s, index) => (
              <HeroSlideCard
                key={s.id}
                slide={s}
                displayOrder={displaySortOrder(s, index)}
                draggable={canReorder}
                isDragging={draggingId === s.id}
                isSavingOrder={isSavingOrder}
                onDragStart={() => onDragStart(s.id)}
                onDragOver={(e) => {
                  if (!canReorder || isSavingOrder) return;
                  e.preventDefault();
                }}
                onDrop={() => onDrop(s.id)}
                data-test-id={`hero-slide-card-${s.id}`}
              />
            ))
          : []
      }
      contentGridColumns={1}
      contentGridGapClassName="gap-6"
      data-test-id="menu-hero-slides-collection"
    />
  );
}
