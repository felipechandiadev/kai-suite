# 00 — Decisiones (Rust Lite / sqlx)

Firmadas para este track. Cambios → actualizar este archivo y [07-decisiones-firmadas.md](../07-decisiones-firmadas.md) si afectan producto.

## ORM y persistencia

| Decisión | Valor |
|----------|--------|
| ORM / acceso a datos | **sqlx** 0.8+ |
| Motor | **SQLite** (mismo archivo app-data que Lite hoy) |
| Migraciones | sqlx migrate, embebidas en el binario |
| Path DB | `paths::business_db_path()` / `LITE_SQLITE_PATH` |
| Logs de app (Nest winston) | En Rust: `tracing` → archivo bajo app-data (`…/logs/`), **nunca** bajo `/usr/lib` |

## Runtime

| Decisión | Valor |
|----------|--------|
| Sidecar Node | Deprecado al completar pasos 08–09 |
| API hacia UI | Tauri `invoke("lite_*")` (JSON), no HTTP `:4100` en modo rust |
| Coexistencia | Flag `KAI_LITE_BACKEND=rust\|sidecar` (default `sidecar` hasta cutover) |
| Print / license / backup | Siguen en Rust Tauri (sin cambio de modelo) |

## Auth

| Decisión | Valor |
|----------|--------|
| Login | Verificación local (hash password) en Rust; respuesta con token opaco o user id |
| Sesión UI | Bearer = user UUID (paridad con Lite actual) o JWT corto firmado en Rust — **v1: Bearer = user UUID** como hoy |
| Roles | Admin / cajero (mismos roles Lite) |

## Alcance v1 Rust

**Dentro:** health, auth, seed, catálogo admin, stock, purchasing (recepciones), POS venta, void, cash sessions, users, company, dashboard, POS current.

**Fuera:** fiscal SII completo, Postgres multi-tenant, e-shop, delivery, HCM, dining. Impresión ESC/POS y licencia machine-bound **ya están** en Tauri.

## Estilo de código

- Capas en `src-tauri/src/lite/`: `commands/` → `application/` → `db/` (sqlx).
- Sin lógica de negocio en controllers UI.
- Cada comando público tiene tests en la [matriz](./pruebas/matriz-metodos.md).

## No hacer

- Reintroducir TypeORM/Node “solo para BD”.
- Mezclar PRs de cutover sidecar con cosmética UI.
- Ampliar schema a todo kai-core cloud; solo tablas que Lite usa.
