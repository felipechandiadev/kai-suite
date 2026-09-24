# 02 — Inventario API Lite → commands Rust

Fuente actual: `kai-core/src/modules/lite/presentation/*.ts`.  
Cliente UI: `kai-store-lite/src/sections/admin/api/lite-admin.api.ts` y POS.

Prefijo Nest: `/api/lite` (salvo auth login que también vive bajo lite).

## Convención de nombres invoke

`lite_<dominio>_<accion>` en snake_case. Ejemplo: `lite_auth_login`, `lite_pos_sale`.

| # | HTTP actual | invoke Rust (objetivo) | Paso | Tests (ids) |
|---|-------------|------------------------|------|-------------|
| 1 | GET `/lite/health` | `lite_health` | 03 | `lite_health_ok` |
| 2 | POST `/lite/login` | `lite_auth_login` | 03 | `lite_auth_login_ok`, `lite_auth_login_bad` |
| 3 | POST `/lite/change-password` | `lite_auth_change_password` | 03 | `lite_auth_change_password_ok`, `…_bad` |
| 4 | POST `/lite/seed` | `lite_seed_run` | 03 | `lite_seed_run_ok` |
| 5 | GET `/lite/catalog` (POS) | `lite_pos_catalog` | 04 | `lite_pos_catalog_ok` |
| 6 | POST `/lite/sale` | `lite_pos_sale` | 06 | `lite_pos_sale_ok`, `lite_pos_sale_no_session`, `lite_pos_sale_stock` |
| 7 | GET `/lite/products` | `lite_admin_products_list` | 04 | `lite_admin_products_list_ok` |
| 8 | POST `/lite/products` | `lite_admin_products_create` | 04 | `…_create_ok`, `…_create_bad` |
| 9 | POST `/lite/products/bulk` | `lite_admin_products_bulk` | 04 | `…_bulk_ok` |
| 10 | PATCH `/lite/products/:id` | `lite_admin_products_patch` | 04 | `…_patch_ok`, `…_patch_404` |
| 11 | GET `/lite/products/:id/variants` | `lite_admin_variants_list` | 04 | `…_list_ok` |
| 12 | POST `/lite/products/:id/variants` | `lite_admin_variants_create` | 04 | `…_create_ok` |
| 13 | GET `/lite/variants/:id` | `lite_admin_variant_get` | 04 | `…_get_ok`, `…_get_404` |
| 14 | PATCH `/lite/variants/:id` | `lite_admin_variant_patch` | 04 | `…_patch_ok` |
| 15 | GET `/lite/variants/:id/pack` | `lite_admin_pack_get` | 04 | `…_get_ok` |
| 16 | PUT `/lite/variants/:id/pack` | `lite_admin_pack_put` | 04 | `…_put_ok` |
| 17 | GET/POST/PATCH `/lite/units` | `lite_admin_units_*` | 04 | por acción |
| 18 | GET/POST/PATCH `/lite/storages` | `lite_admin_storages_*` | 04 | por acción |
| 19 | GET/POST/PATCH/DELETE `/lite/categories` | `lite_admin_categories_*` | 04 | por acción |
| 20 | GET/POST/PATCH/DELETE `/lite/attributes` | `lite_admin_attributes_*` | 04 | por acción |
| 21 | GET `/lite/stock` | `lite_admin_stock_list` | 05 | `…_list_ok` |
| 22 | POST `/lite/stock/adjust` | `lite_admin_stock_adjust` | 05 | `…_adjust_ok`, `…_adjust_bad` |
| 23 | POST `/lite/stock/delta` | `lite_admin_stock_delta` | 05 | `…_delta_ok` |
| 24 | POST `/lite/stock/transfer` | `lite_admin_stock_transfer` | 05 | `…_transfer_ok`, `…_transfer_bad` |
| 25 | GET `/lite/customers` | `lite_admin_customers_list` | 06 | `…_ok` |
| 26 | GET `/lite/suppliers` | `lite_admin_suppliers_list` | 06 | `…_ok` |
| 27 | GET `/lite/sales` | `lite_admin_sales_list` | 06 | `…_ok` |
| 28 | GET `/lite/sales/:id` | `lite_admin_sales_get` | 06 | `…_get_ok`, `…_get_404` |
| 29 | POST `/lite/sales/:id/void` | `lite_admin_sales_void` | 06 | `…_void_ok`, `…_void_bad` |
| 30 | GET/POST `/lite/receptions` | `lite_admin_receptions_*` | 05 | list/create |
| 31 | GET `/lite/dashboard` | `lite_admin_dashboard` | 07 | `…_ok` |
| 32 | GET/PATCH `/lite/company` | `lite_admin_company_*` | 07 | get/patch |
| 33 | GET `/lite/points-of-sale` | `lite_admin_pos_list` | 07 | `…_ok` |
| 34 | GET/PATCH `/lite/points-of-sale/current` | `lite_admin_pos_current_*` | 07 | get/patch |
| 35 | GET `/lite/cash-sessions` | `lite_ops_cash_list` | 06 | `…_ok` |
| 36 | GET `/lite/cash-sessions/:id/movements` | `lite_ops_cash_movements` | 06 | `…_ok` |
| 37 | POST `/lite/cash-sessions` | `lite_ops_cash_open` | 06 | `…_open_ok`, `…_open_dup` |
| 38 | POST `/lite/cash-sessions/:id/close` | `lite_ops_cash_close` | 06 | `…_close_ok` |
| 39 | POST `…/deposit` | `lite_ops_cash_deposit` | 06 | `…_ok` |
| 40 | POST `…/withdrawal` | `lite_ops_cash_withdrawal` | 06 | `…_ok` |
| 41 | GET/POST/DELETE `/lite/users` | `lite_admin_users_*` | 07 | list/create/delete |

Detalle de tests: [pruebas/matriz-metodos.md](./pruebas/matriz-metodos.md).

## Nota

Algunas rutas aparecen duplicadas entre controllers (catalog POS vs admin, receptions). En Rust unificar en un solo command por caso de uso; la UI elige el mismo invoke.

Aliases UI (Nest paths → commands):
- `GET /lite/pos/catalog` → `lite_pos_catalog` (paginado `{ items, total }`)
- `POST /lite/pos/sale` → `lite_pos_sale`
- `GET|POST /lite/purchasing/receptions` → `lite_admin_receptions_*`

**Fuera de v1 rust (histórico):** ya no aplica — `POST /sales-reports/:id/run` → `lite_sales_report_run` (sqlx).
