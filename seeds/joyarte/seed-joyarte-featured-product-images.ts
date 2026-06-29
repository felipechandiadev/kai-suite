import type { JoyarteCatalogJson } from './seed-joyarte-catalog';
import { buildJoyarteProductImagesFromCatalog } from './seed-joyarte-catalog-images';

/** Imágenes de productos destacados eShop (nombres exactos del catálogo). */
export const SEED_JOYARTE_FEATURED_PRODUCT_IMAGES = [
  {
    productName: 'Anillo Compromiso de Oro de 18kt Solitario 29 puntos de diamante',
    imageFile: 'products/01-compromiso-oro-solitario.jpg',
  },
  {
    productName: 'Anillo Compromiso Platino 950  Nápoles 1x12ptos Diamante',
    imageFile: 'products/02-compromiso-platino-napoles.jpg',
  },
  {
    productName: 'Par Argollas Matrimonio de Platino de 2,0mm Verona',
    imageFile: 'products/03-argollas-platino-verona.jpg',
  },
  {
    productName: 'Anillo Oro Blanco 18kt Perla Nácar',
    imageFile: 'products/04-oro-blanco-perla-nacar.jpg',
  },
  {
    productName: 'Collares de Oro 18kt Modelo Mariposa & Circones',
    imageFile: 'products/05-collar-oro-mariposa.jpg',
  },
  {
    productName: 'Aros Oro 18kt  Argolla Circonita',
    imageFile: 'products/06-aros-oro-argolla-circonita.jpg',
  },
  {
    productName: 'Cadena Oro 18Kt Portuguesa',
    imageFile: 'products/07-cadena-oro-portuguesa.jpg',
  },
  {
    productName: 'Anillo de Plata Esterlina 925 Roseta',
    imageFile: 'products/08-anillo-plata-roseta.jpg',
  },
  {
    productName: 'Collar de Plata Esterlina 925 Corazones',
    imageFile: 'products/09-collar-plata-corazones.jpg',
  },
] as const;

export function buildJoyarteProductImagesForSeed(
  catalog: JoyarteCatalogJson,
): { productName: string; imageFile: string }[] {
  const byName = new Map(
    buildJoyarteProductImagesFromCatalog(catalog).map((entry) => [entry.productName, entry]),
  );
  for (const entry of SEED_JOYARTE_FEATURED_PRODUCT_IMAGES) {
    byName.set(entry.productName, entry);
  }
  return [...byName.values()];
}
