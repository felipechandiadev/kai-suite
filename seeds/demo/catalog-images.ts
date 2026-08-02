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

/** Imagen principal por producto (tienda / catálogo general). */
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

/**
 * Imágenes carta KaiFood / Restó Demo (suite + food mode).
 * Incluye overlaps con tienda (café, galletas) y elaborados/preparados de menú.
 */
export const SEED_KAIFOOD_PRODUCT_IMAGES: readonly SeedDevProductImageDef[] = [
  { productName: 'Café molido premium', imageFile: 'products/cafe-molido-premium.png' },
  { productName: 'Galletas surtidas', imageFile: 'products/galletas-surtidas.png' },
  { productName: 'Torta cumpleaños', imageFile: 'products/torta-cumpleanos.png' },
  { productName: 'Medialuna', imageFile: 'products/medialuna.png' },
  { productName: 'Pie de limón', imageFile: 'products/pie-de-limon.png' },
  { productName: 'Brownie', imageFile: 'products/brownie.png' },
  { productName: 'Empanada de horno', imageFile: 'products/empanada-de-horno.png' },
  { productName: 'Pan de masa madre', imageFile: 'products/pan-de-masa-madre.png' },
  { productName: 'Hamburguesa clásica', imageFile: 'products/hamburguesa-clasica.png' },
  { productName: 'Completo italiano', imageFile: 'products/completo-italiano.png' },
  { productName: 'Bebida gaseosa', imageFile: 'products/bebida-gaseosa.png' },
  { productName: 'Combo del día', imageFile: 'products/combo-del-dia.png' },
] as const;

/** Imagen por variante (calcetines Gris S/M/L). */
export const SEED_DEV_VARIANT_IMAGES: readonly SeedDevVariantImageDef[] = [
  { sku: 'SEEDDEVCALSGRA', imageFile: 'variants/SEEDDEVCALSGRA.png' },
  { sku: 'SEEDDEVCALMGRA', imageFile: 'variants/SEEDDEVCALMGRA.png' },
  { sku: 'SEEDDEVCALLGRA', imageFile: 'variants/SEEDDEVCALLGRA.png' },
] as const;
