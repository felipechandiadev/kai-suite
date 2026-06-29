/**
 * Imágenes de catálogo demo (relativas a `seed/assets/`).
 * Ver `assets/INVENTORY.md` para la tabla archivo ↔ entidad.
 */
export type SeedDevProductImageDef = {
  productName: string;
  imageFile: string;
};

export type SeedDevVariantImageDef = {
  sku: string;
  imageFile: string;
};

/** Imagen principal por producto (15). */
export const SEED_DEV_PRODUCT_IMAGES: readonly SeedDevProductImageDef[] = [
  { productName: 'Aceite de oliva extra virgen', imageFile: 'products/aceite-oliva-extra-virgen.png' },
  { productName: 'Café molido premium', imageFile: 'products/cafe-molido-premium.png' },
  { productName: 'Harina integral', imageFile: 'products/harina-integral.png' },
  { productName: 'Galletas surtidas', imageFile: 'products/galletas-surtidas.png' },
  { productName: 'Té verde caja 20 bolsitas', imageFile: 'products/te-verde-caja-20-bolsitas.png' },
  { productName: 'Polera algodón', imageFile: 'products/polera-algodon.png' },
  { productName: 'Calcetines deportivos', imageFile: 'products/calcetines-deportivos.png' },
  { productName: 'Detergente líquido 3 L', imageFile: 'products/detergente-liquido-3l.png' },
  { productName: 'Toalla baño algodón', imageFile: 'products/toalla-bano-algodon.png' },
  { productName: 'Mouse inalámbrico', imageFile: 'products/mouse-inalambrico.png' },
  { productName: 'Cable HDMI 2 m', imageFile: 'products/cable-hdmi-2m.png' },
  { productName: 'Cuaderno universitario 100 hojas', imageFile: 'products/cuaderno-universitario-100-hojas.png' },
  { productName: 'Mochila urbana', imageFile: 'products/mochila-urbana.png' },
  { productName: 'Servicio armado de pedido', imageFile: 'products/servicio-armado-pedido.png' },
  { productName: 'Pack plantillas hoja de cálculo', imageFile: 'products/pack-plantillas-hoja-calculo.png' },
] as const;

/** Imagen por variante (calcetines Gris S/M/L). */
export const SEED_DEV_VARIANT_IMAGES: readonly SeedDevVariantImageDef[] = [
  { sku: 'SEED-DEV-CAL-S-GRA', imageFile: 'variants/SEED-DEV-CAL-S-GRA.png' },
  { sku: 'SEED-DEV-CAL-M-GRA', imageFile: 'variants/SEED-DEV-CAL-M-GRA.png' },
  { sku: 'SEED-DEV-CAL-L-GRA', imageFile: 'variants/SEED-DEV-CAL-L-GRA.png' },
] as const;
