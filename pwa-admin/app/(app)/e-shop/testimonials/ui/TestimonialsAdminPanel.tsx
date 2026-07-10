"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import type { EShopTestimonialRow } from "@/features/e-shop-testimonials/infrastructure/eshop-testimonials.request";
import { createTestimonialAction } from "@/features/e-shop-testimonials/actions/testimonial.action";
import { TestimonialAdminCard } from "./TestimonialAdminCard";

export function TestimonialsAdminPanel({ initialItems }: { initialItems: EShopTestimonialRow[] }) {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [rating, setRating] = useState("5");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="space-y-8 max-w-3xl">
      <form
        className="space-y-4 rounded-xl border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          createTestimonialAction({
            clientName,
            rating: Number(rating),
            message,
          })
            .then(() => {
              setClientName("");
              setMessage("");
              router.refresh();
            })
            .finally(() => setSubmitting(false));
        }}
      >
        <h2 className="font-semibold">Crear testimonio</h2>
        <p className="text-sm text-muted-foreground">
          Tras crear el testimonio podrás subir la foto del cliente en la tarjeta correspondiente.
        </p>
        <TextField label="Nombre del cliente" value={clientName} onChange={(e) => setClientName(e.target.value)} />
        <TextField label="Calificación (1-5)" value={rating} onChange={(e) => setRating(e.target.value)} />
        <TextField
          label="Mensaje"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Cuéntanos cómo usaste el producto en tu día a día…"
        />
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Creando…" : "Crear"}
        </Button>
      </form>
      <ul className="space-y-4">
        {initialItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay testimonios.</p>
        ) : (
          initialItems.map((t) => <TestimonialAdminCard key={t.id} testimonial={t} />)
        )}
      </ul>
    </div>
  );
}
