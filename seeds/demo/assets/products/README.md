# Imágenes de productos (catálogo seed)

Una imagen por **producto padre** (`entityType: product`). Se usa como imagen principal en grid admin, eShop y kai-menu.

## Convención de nombres

Slug del nombre del producto en minúsculas, guiones, sin acentos:

| Archivo sugerido | Producto en seed |
|------------------|------------------|
| `calcetines-deportivos.png` | Calcetines deportivos |
| `polera-algodon.png` | Polera algodón |
| `toalla-bano-algodon.png` | Toalla baño algodón |
| `cafe-molido-premium.png` | Café molido premium |
| `brownie.png` | Brownie (KaiFood) |
| `empanada-de-horno.png` | Empanada de horno (KaiFood) |

Formatos: **PNG**, **JPEG** o **WebP**. Una imagen por producto (la primera será `primary-image`).

KaiFood / Restó Demo: ver `SEED_KAIFOOD_PRODUCT_IMAGES` en `catalog-images.ts`.

Cuando el seed enlace multimedia de productos esté activo, los archivos presentes aquí se copian a `public/uploads` al ejecutar `npm run seed`.
