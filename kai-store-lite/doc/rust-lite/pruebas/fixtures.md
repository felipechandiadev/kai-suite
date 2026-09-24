# Fixtures de test — Lite sqlx

## Helper obligatorio

```rust
// src-tauri/src/lite/test_support.rs (objetivo, paso 02+)
async fn lite_test_pool() -> SqlitePool {
    // 1. tempfile Unique SQLite
    // 2. sqlx::migrate!("./migrations").run(&pool).await
    // 3. seed mínimo (abajo)
    // 4. return pool
}
```

Cada test crea su propio pool (no compartir estado entre tests).

## Seed mínimo (`lite_seed_fixture`)

| Entidad | Valores |
|---------|---------|
| Company | `id=1`, name `Demo Lite`, currency `CLP` |
| User admin | username `admin`, password hash de `admin123` (mismo algoritmo que prod) |
| User cajero | username `cajero`, password `cajero123` |
| Point of sale | `POS-1`, linked a company |
| Storage | `Bodega principal` |
| Unit | `UN` |
| Category | `General` |
| Product + variant | SKU `SKU-001`, price `1000`, stock `10` en storage |
| Cash session | **cerrada** por defecto; tests de venta abren una |

## Casos especiales

| Fixture | Uso |
|---------|-----|
| `fixture_open_cash_session` | Caja abierta para `lite_pos_sale_*` |
| `fixture_sale_completed` | Venta hecha para void / get |
| `fixture_two_storages` | Transfer stock |
| `fixture_zero_stock` | `lite_pos_sale_stock` (rechazo) |

## Auth en tests

Bearer Lite en rust = `user_id` (o token opaco documentado en paso 03).  
Helper: `auth_admin(pool) -> String` / `auth_cajero(pool)`.

## No usar

- DB de desarrollo del usuario.
- Archivos bajo Application Support reales.
- Puerto HTTP / sidecar Node.
