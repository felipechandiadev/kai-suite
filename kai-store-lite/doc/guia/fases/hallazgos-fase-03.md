# Hallazgos — Fase 03 Core Lite

## SQLite vs Postgres

| Tema | Hallazgo | Mitigación actual |
|------|----------|-------------------|
| `jsonb` en entidades | Varias entidades (p. ej. `ProductionUnit.kitchenPrintSettings`, promociones) declaran `jsonb` | En Lite, `patchEntityColumnsForSqlite()` en `sqlite-column.compat.ts` reescribe metadata `jsonb` → `json` al cargar `typeorm.config.ts`. |
| `enum` TypeORM | `users.rol`, `persons.type` usan `enum` | SQLite los guarda como `varchar`; OK en smoke local. |
| CHECK constraints | `users_role_company_chk` en `users` | SQLite acepta CHECK; validar login admin tras seed. |
| Módulos full suite | `AppLiteModule` registra solo health/auth/users/companies + lite | **No ampliar** a módulos POS/catálogo full; la lógica de negocio Lite vive en `LiteModule` services (`lite-seed`, `lite-stock`, `lite-commerce`, `lite-ops`). |
| Entidades Lite | `LITE_ENTITIES` en `lite-entities.ts` | Subconjunto store (+ relaciones mínimas: `ProductionUnit`, `Shareholder`, etc.). Sin notificaciones/fiscal SII/dining/e-shop/HCM. |

## Redis

- Edición Lite usa `MemoryCacheAdapter` (in-process). No se levanta Redis.
- `RedisCacheAdapter` no conecta si `KAI_EDITION=lite`.

## Seed mínimo (fases 05–08)

- `POST /api/lite/seed` crea empresa completa: branch HQ, unit UN, IVA 19%, storage STORE default, POS "Caja 1", admin (`admin`/`admin1234`) + cajero (`cajero`/`cajero1234`), productos PHYSICAL/SERVICE/PACK + stock 20 en físico, cliente contado, proveedor demo.
- Idempotente si el usuario admin ya existe (`seeded: false`).
- Respuesta enriquecida: `branchId`, `storageId`, `posId`, `sampleVariantIds`, `cashierUserName`.

## API pragmática `/api/lite/*`

| Área | Endpoints |
|------|-----------|
| Auth / seed / health | `POST /lite/auth/login`, `POST /lite/seed`, `GET /lite/health` |
| Catálogo / stock | `GET /lite/catalog`, `GET /lite/stock`, `GET /lite/pos/catalog` |
| Ventas / compras | `POST /lite/pos/sale`, `POST /lite/purchasing/receptions`, `GET /lite/sales`, `GET /lite/receptions` |
| Maestro | `GET /lite/customers`, `GET /lite/suppliers`, `GET /lite/users`, `GET /lite/company`, `GET /lite/dashboard` |
| Caja | `GET /lite/points-of-sale`, `GET|POST /lite/cash-sessions`, `POST /lite/cash-sessions/:id/close` |

- Auth Lite: Bearer = UUID del usuario (no JWT suite).
- Ventas/recepciones: IDs persistidos en memoria de proceso (list endpoints); stock en `stock_levels` (upsert por storage default).
- Sin fallbacks demo (`v-phys`): catálogo vacío si no hay seed; `variantId` debe ser UUID real.

## Entrypoint

- `kai-store-lite/scripts/lite-entrypoint.mjs` fija `KAI_EDITION=lite`, SQLite en `kai-store-lite/.data/kai-store-lite.sqlite` y ejecuta `kai-core/dist/main.js`.
- Requiere `npm run build` en `kai-core` antes del primer arranque.
- Para smoke limpio: borrar el sqlite y re-seed.

## Health

- Lite UI: `GET {VITE_CORE_URL}/lite/health` → `{ ok, edition: 'lite', version, ... }`.
- Estándar Nest: `GET /api/health` sigue disponible en Lite.

## Sidecar Rust (stubs)

- `src-tauri/src/sidecar/*.rs` y `commands/sidecar_cmd.rs` son stubs; wiring completo en fase packaging.

## Próximos pasos

1. UI Admin/POS consumiendo `/api/lite/*` E2E (seed → recepción → venta → caja).
2. Migraciones SQLite dedicadas si se desactiva `synchronize` en producción Lite.
3. Persistir ventas/recepciones en tablas reales (Transaction/Reception) cuando se necesite auditoría cross-restart.
