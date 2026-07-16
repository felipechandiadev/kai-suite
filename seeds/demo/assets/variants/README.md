# Imágenes de variantes (catálogo seed)

Una imagen por **variante** (`entityType: product-variant`), opcional. Útil para fotos por color/talla (p. ej. calcetines negro vs blanco).

## Convención de nombres

Usar el **SKU seed** del catálogo (`SEEDDEV*`):

| Archivo sugerido | Variante |
|------------------|----------|
| `SEEDDEVCALMNEG.png` | Calcetines M Negro |
| `SEEDDEVCALMBLA.png` | Calcetines M Blanco |
| `SEEDDEVPOLMNEG.png` | Polera M Negro |

Consulta SKUs en `catalog.ts`.

Formatos: **PNG**, **JPEG** o **WebP**.

Cuando el seed enlace multimedia de variantes esté activo, los archivos presentes aquí se copian al storage al ejecutar `npm run seed`.
