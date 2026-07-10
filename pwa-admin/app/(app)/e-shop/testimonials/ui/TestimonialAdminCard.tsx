"use client";

import { useRouter } from "next/navigation";
import { Button } from "@kai/ui";
import { EntityMultimediaPanel } from "../../../catalog/products/ui/EntityMultimediaPanel";
import type { EShopTestimonialRow } from "@/features/e-shop-testimonials/infrastructure/eshop-testimonials.request";
import { deleteTestimonialAction } from "@/features/e-shop-testimonials/actions/testimonial.action";

export function TestimonialAdminCard({ testimonial }: { testimonial: EShopTestimonialRow }) {
  const router = useRouter();

  return (
    <li className="space-y-4 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium">{testimonial.clientName}</p>
          <p className="text-xs text-muted-foreground">{"★".repeat(testimonial.rating)}</p>
          <p className="text-sm text-muted-foreground">{testimonial.message}</p>
          {!testimonial.isActive ? (
            <p className="text-xs text-amber-600">Inactivo (no visible en la tienda)</p>
          ) : null}
        </div>
        <Button
          variant="secondary"
          onClick={() => deleteTestimonialAction(testimonial.id).then(() => router.refresh())}
        >
          Eliminar
        </Button>
      </div>
      <EntityMultimediaPanel
        entityType="e-shop-testimonial"
        entityId={testimonial.id}
        title="Foto del cliente"
        collectionOnly
        onChanged={() => router.refresh()}
      />
    </li>
  );
}
