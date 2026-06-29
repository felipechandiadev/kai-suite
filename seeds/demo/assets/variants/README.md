# Imágenes de variantes (catálogo seed)

Una imagen por **variante** (`entityType: product-variant`), opcional. Útil para fotos por color/talla (p. ej. calcetines negro vs blanco).

## Convención de nombres

Usar el **SKU seed** del catálogo (`SEED-DEV-*`):

| Archivo sugerido | Variante |
|------------------|----------|
| `SEED-DEV-CAL-M-NEG.png` | Calcetines M Negro |
| `SEED-DEV-CAL-M-BLA.png` | Calcetines M Blanco |
| `SEED-DEV-POL-M-NEG.png` | Polera M Negro |

Consulta SKUs en `catalog.ts`.

Formatos: **PNG**, **JPEG** o **WebP**.

Cuando el seed enlace multimedia de variantes esté activo, los archivos presentes aquí se copian al storage al ejecutar `npm run seed`.
