# Matriz de métodos — Lite Rust (sqlx)

Leyenda: `[ ]` pending · `[x]` verde · N/A = no aplica aún.

Fuente: [../02-inventario-api-lite.md](../02-inventario-api-lite.md).

## Paso 01 — Scaffold

| Test id | Caso | Status |
|---------|------|--------|
| `lite_health_ok` | Stub/health ok | [x] |

## Paso 02 — Migraciones

| Test id | Caso | Status |
|---------|------|--------|
| `lite_migrate_empty_ok` | Migrate DB vacía | [x] |
| `lite_migrate_idempotent` | Re-apply OK | [x] |

## Paso 03 — Auth / health / seed

| Test id | Caso | Status |
|---------|------|--------|
| `lite_health_ok` | DB ping + edition | [x] |
| `lite_auth_login_ok` | Credenciales válidas | [x] |
| `lite_auth_login_bad` | Password incorrecto | [x] |
| `lite_auth_change_password_ok` | Cambio OK | [x] |
| `lite_auth_change_password_bad` | Actual incorrecta | [x] |
| `lite_seed_run_ok` | Seed aplica | [x] |

## Paso 04 — Catálogo

| Test id | Caso | Status |
|---------|------|--------|
| `lite_pos_catalog_ok` | Lista POS | [x] |
| `lite_admin_products_list_ok` | Lista admin | [x] |
| `lite_admin_products_create_ok` | Create | [x] |
| `lite_admin_products_create_bad` | Validación | [x] |
| `lite_admin_products_bulk_ok` | Bulk | [x] |
| `lite_admin_products_patch_ok` | Patch | [x] |
| `lite_admin_products_patch_404` | Id inexistente | [x] |
| `lite_admin_variants_list_ok` | List variants | [x] |
| `lite_admin_variants_create_ok` | Create variant | [x] |
| `lite_admin_variant_get_ok` | Get | [x] |
| `lite_admin_variant_get_404` | 404 | [x] |
| `lite_admin_variant_patch_ok` | Patch | [x] |
| `lite_admin_pack_get_ok` | Pack get | [x] |
| `lite_admin_pack_put_ok` | Pack put | [x] |
| `lite_admin_units_list_ok` | Units list | [x] |
| `lite_admin_units_create_ok` | Units create | [x] |
| `lite_admin_units_patch_ok` | Units patch | [x] |
| `lite_admin_storages_list_ok` | Storages list | [x] |
| `lite_admin_storages_create_ok` | Storages create | [x] |
| `lite_admin_storages_patch_ok` | Storages patch | [x] |
| `lite_admin_categories_list_ok` | Categories list | [x] |
| `lite_admin_categories_create_ok` | Categories create | [x] |
| `lite_admin_categories_patch_ok` | Categories patch | [x] |
| `lite_admin_categories_delete_ok` | Categories delete | [x] |
| `lite_admin_categories_delete_bad` | FK / en uso | [x] |
| `lite_admin_attributes_list_ok` | Attributes list | [x] |
| `lite_admin_attributes_create_ok` | Attributes create | [x] |
| `lite_admin_attributes_patch_ok` | Attributes patch | [x] |
| `lite_admin_attributes_delete_ok` | Attributes delete | [x] |
| `lite_admin_attributes_delete_bad` | FK / en uso | [x] |

## Paso 05 — Stock / purchasing

| Test id | Caso | Status |
|---------|------|--------|
| `lite_admin_stock_list_ok` | List stock | [x] |
| `lite_admin_stock_adjust_ok` | Adjust | [x] |
| `lite_admin_stock_adjust_bad` | Qty inválida | [x] |
| `lite_admin_stock_delta_ok` | Delta | [x] |
| `lite_admin_stock_transfer_ok` | Transfer | [x] |
| `lite_admin_stock_transfer_bad` | Insuficiente / mismo storage | [x] |
| `lite_admin_receptions_list_ok` | List | [x] |
| `lite_admin_receptions_create_ok` | Create + stock↑ | [x] |
| `lite_admin_receptions_create_bad` | Validación | [x] |

## Paso 06 — Ventas / caja / partners

| Test id | Caso | Status |
|---------|------|--------|
| `lite_pos_sale_ok` | Venta con caja abierta | [x] |
| `lite_pos_sale_no_session` | Sin caja → error | [x] |
| `lite_pos_sale_stock` | Stock insuficiente | [x] |
| `lite_admin_customers_list_ok` | Customers | [x] |
| `lite_admin_suppliers_list_ok` | Suppliers | [x] |
| `lite_admin_sales_list_ok` | Sales list | [x] |
| `lite_admin_sales_get_ok` | Sale get | [x] |
| `lite_admin_sales_get_404` | 404 | [x] |
| `lite_admin_sales_void_ok` | Void + stock/caja | [x] |
| `lite_admin_sales_void_bad` | Ya void / no existe | [x] |
| `lite_ops_cash_list_ok` | Sessions list | [x] |
| `lite_ops_cash_movements_ok` | Movements | [x] |
| `lite_ops_cash_open_ok` | Open | [x] |
| `lite_ops_cash_open_dup` | Segunda abierta → error | [x] |
| `lite_ops_cash_close_ok` | Close + conteo | [x] |
| `lite_ops_cash_deposit_ok` | Deposit | [x] |
| `lite_ops_cash_withdrawal_ok` | Withdrawal | [x] |

## Paso 07 — Users / company / dashboard / POS

| Test id | Caso | Status |
|---------|------|--------|
| `lite_admin_dashboard_ok` | Aggregates | [x] |
| `lite_admin_company_get_ok` | Get company | [x] |
| `lite_admin_company_patch_ok` | Patch company | [x] |
| `lite_admin_pos_list_ok` | POS list | [x] |
| `lite_admin_pos_current_get_ok` | Current get | [x] |
| `lite_admin_pos_current_patch_ok` | Current patch | [x] |
| `lite_admin_users_list_ok` | Users list | [x] |
| `lite_admin_users_create_ok` | Create | [x] |
| `lite_admin_users_create_bad` | Dup / validación | [x] |
| `lite_admin_users_delete_ok` | Delete | [x] |
| `lite_admin_users_delete_bad` | Self / last admin | [x] |

## Paso 08–10 — UI / cutover / packaging

| Check | Caso | Status |
|-------|------|--------|
| Smoke login+venta rust | Manual | [x] |
| Sin proceso Node | `ps` / Activity | [x] |
| Packaging slim | Artefacto sin sidecar | [x] |
| Chromebook / bookworm | Install + health | [x] |
| `lite_sales_report_run_ok` | Reportes ventas sqlx | [x] |

## Resumen cobertura

Al cerrar paso 07: **todas** las filas de pasos 01–07 en `[x]`.  
Al cerrar paso 09: smoke + sin Node.  
Al cerrar paso 10: packaging + Chromebook.
