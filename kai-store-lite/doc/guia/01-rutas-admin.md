# 01 — Rutas Admin Lite

Prefijo UI: `/admin`. Layout: sidebar agrupado (`AdminSidebar`) + páginas cliente Vite.

Menú **ventas-only**: sin compras, clientes, listas de precios, promos, sucursales ni contabilidad.

## Menú sidebar

| Grupo | Label | Ruta |
|-------|-------|------|
| Ventas | Transacciones | `/admin/sales/transactions` |
| Ventas | Punto de venta | `/admin/sales/pos` |
| Ventas | Sesiones de caja | `/admin/sales/cash-sessions` |
| Inventario | Catálogo | `/admin/catalog/products` |
| Inventario | Categorías | `/admin/inventory/categories` |
| Inventario | Atributos | `/admin/inventory/attributes` |
| Inventario | Unidades | `/admin/inventory/units` |
| Inventario | Almacenes | `/admin/inventory/storages` |
| Inventario | Existencias | `/admin/inventory/stock` |
| Reportes | Resumen | `/admin` |
| Reportes | Ventas | `/admin/reports/sales` |
| Config | Empresa | `/admin/settings/company` |
| Config | Usuarios | `/admin/settings/users` |
| Config | Impresión | `/admin/settings/printers` |
| Config | Backup | `/admin/settings/backup` |
| Config | Acerca de | `/admin/settings/about` |

Listas densas (catálogo, transacciones, sesiones, existencias, impresión) usan **`LiteDataGrid`** (`DataGridTable` de `@kai/ui`, paginación controlada). Colecciones con cards: categorías, atributos, unidades, almacenes, usuarios.

Hub `/admin/catalog` → redirect a products.

## Detalle catálogo

`/admin/catalog/products/variants/:variantId` — secciones Identidad / Precios (`basePrice`) / Inventario / Pack (solo tipo PACK).

**Multi-variante:** el listado es **1 fila = 1 producto** (como Suite), con **expand** para ver variantes (SKU, atributos, precio) y agregar hermanas. Detalle de variante: Identidad edita `attributeValues` + bloque Hermanas. APIs: `GET /lite/products` (anidadas), `GET/POST /lite/products/:productId/variants`, `PATCH /lite/variants/:id` con `attributeValues`.

Tipos: **PHYSICAL | SERVICE | PACK** (+ **INSUMO** como componente de pack).

## Stock

Sin recepciones en UI. Entrada de stock vía **ajuste de existencias** (`POST /lite/stock/adjust` con `targetQty`) + seed.

## OUT (redirect → Panel)

Clientes, precios, promos, recepciones, proveedores, IVA, CxC, CxP, sucursal, multi-POS listado.

## POS

Métodos de pago: efectivo / tarjeta / transferencia. **Sin CREDIT** ni selector de cliente.
