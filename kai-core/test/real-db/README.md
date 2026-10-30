# Pruebas con base de datos real (`test:real-db`)

Escenarios que corren la app de Nest completa contra una **copia temporal** de una BD demo local
(se clona, se aplican migraciones, se prueba y se elimina). Atrapan errores que los mocks no ven
(columnas inexistentes, migraciones sin registrar, eventos post-commit).

```bash
cd kai-core && npm run test:real-db
```

Requisitos: Postgres local, Redis local y un `.env` de kai-core (en un worktree se usa el del checkout principal).

| Variable | Default | Uso |
|---|---|---|
| `REAL_DB_SOURCE` | `DB_DATABASE` del `.env` | BD a clonar |
| `REAL_DB_ADMIN_USER` | usuario del SO | rol con `CREATEDB` |
| `REAL_DB_KEEP=1` | — | conserva la copia para inspeccionarla |

Escenarios actuales: recepción→anulación, venta→anulación, eliminar producto con/sin existencias.

Notas para escribir escenarios:
- Los datos de prueba se crean por SQL (`support/fixtures.ts`); la BD demo no trae proveedores ni productos físicos.
- Las llamadas a servicios van dentro de `asCompany(...)` (equivale al `TenantGuard`).
- El stock lo aplica un evento **post-commit**: usar `waitForStock(...)`, no leer de inmediato.
