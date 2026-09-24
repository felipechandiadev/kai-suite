# 03 — Schema SQLite (mínimo Lite)

No portar todo el schema cloud de kai-core. Solo tablas necesarias para los commands del inventario.

## Principios

- Migraciones sqlx numeradas (`migrations/001_….sql`, …).
- IDs: TEXT UUID (paridad con Lite actual) salvo que se documente cambio.
- Una empresa (`companies` / fila current).
- Stock y ventas deben ser auditables (movimientos / líneas).

## Tablas candidatas (v1)

Ajustar nombres al schema real que Lite ya escribe con TypeORM al implementar paso-02 (inspeccionar `business.sqlite` de una instalación Lite).

| Área | Tablas (orientativo) |
|------|----------------------|
| Org | `companies`, `branches`, `points_of_sale` |
| Users | `users`, `user_roles` / membership |
| Catálogo | `products`, `product_variants`, `categories`, `attributes`, `attribute_values`, `units`, `storages`, `variant_packs` |
| Stock | `stock_levels`, `stock_movements` |
| Comercio | `customers`, `suppliers`, `transactions`, `transaction_lines`, `payments` |
| Caja | `cash_sessions`, `cash_movements` |
| Compras | `receptions`, `reception_lines` |
| Meta | `_sqlx_migrations` |

## Migraciones

1. `001_init_core.sql` — org + users  
2. `002_catalog.sql`  
3. `003_stock.sql`  
4. `004_commerce_cash.sql`  
5. `005_purchasing.sql`  

Cada migración: `up` only en v1 (sqlx migrate).

## Path runtime

Igual que hoy: `~/.local/share/KaiStore Lite/business.sqlite` (Linux), Application Support (macOS), APPDATA (Windows) vía [`paths.rs`](../../src-tauri/src/paths.rs).

## Compatibilidad con DB TypeORM existente

**Opción B (adoptada):** schema sqlx propio + seed. No abrir DB TypeORM existente (columnas/nombres distintos).

En runtime (`lite/db/pool.rs`): si `business.sqlite` es schema Nest/TypeORM (p. ej. `companies` sin columna `name`, o `users.userName`), se renombra a `business.typeorm-<timestamp>.sqlite.bak` y se crea una DB sqlx fresca + seed. Opción A (migrar datos TypeORM) queda fuera de v1.
