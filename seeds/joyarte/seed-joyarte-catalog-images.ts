import type { JoyarteCatalogJson } from './seed-joyarte-catalog';

export function buildJoyarteProductImagesFromCatalog(
  catalog: JoyarteCatalogJson,
): { productName: string; imageFile: string }[] {
  return catalog.products
    .filter((p) => p.imageFile)
    .map((p) => ({
      productName: p.name,
      imageFile: p.imageFile!,
    }));
}
