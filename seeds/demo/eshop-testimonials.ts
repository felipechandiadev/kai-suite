export type SeedDevEshopTestimonialDef = {
  key: string;
  clientName: string;
  rating: number;
  message: string;
  sortOrder: number;
  /** Avatar relativo a `seed/assets/` (opcional). */
  imageFile?: string;
};

/** Testimonios demo eShop — carrusel home (6 ítems). */
export const SEED_DEV_ESHOP_TESTIMONIALS: readonly SeedDevEshopTestimonialDef[] = [
  {
    key: 'martin',
    clientName: 'Martín González',
    rating: 5,
    message:
      'Compré calcetines y una polera; llegaron rápido y la calidad superó lo que esperaba. Volveré a pedir.',
    sortOrder: 1,
    imageFile: 'testimonials/1.png',
  },
  {
    key: 'carlos',
    clientName: 'Carlos Muñoz',
    rating: 5,
    message:
      'Atención excelente por WhatsApp y retiro en sucursal sin filas. Muy recomendable para compras del hogar.',
    sortOrder: 2,
    imageFile: 'testimonials/2.png',
  },
  {
    key: 'valentina',
    clientName: 'Valentina Rojas',
    rating: 4,
    message:
      'La tienda online es clara y el checkout simple. Las toallas son suaves y absorbentes.',
    sortOrder: 3,
    imageFile: 'testimonials/3.png',
  },
  {
    key: 'andres',
    clientName: 'Andrés Pérez',
    rating: 5,
    message:
      'Precios justos y despacho a tiempo. Me gustó poder ver stock antes de pagar.',
    sortOrder: 4,
    imageFile: 'testimonials/4.png',
  },
  {
    key: 'camila',
    clientName: 'Camila Soto',
    rating: 5,
    message:
      'Primera compra en la eShop y quedé feliz: empaque cuidado y productos tal como en las fotos.',
    sortOrder: 5,
    imageFile: 'testimonials/5.png',
  },
  {
    key: 'rodrigo',
    clientName: 'Rodrigo Silva',
    rating: 4,
    message:
      'Buena variedad de tallas y colores. El mapa de sucursales me ayudó a retirar cerca de casa.',
    sortOrder: 6,
    imageFile: 'testimonials/6.jpeg',
  },
] as const;
