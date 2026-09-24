# Pasos de implementación — Rust Lite (sqlx)

Orden estricto. No saltar pasos sin actualizar inventario/matriz.

| Paso | Doc | Done |
|------|-----|------|
| 01 | [paso-01-scaffold-sqlx.md](./paso-01-scaffold-sqlx.md) | [x] |
| 02 | [paso-02-migraciones-schema.md](./paso-02-migraciones-schema.md) | [x] |
| 03 | [paso-03-auth-health.md](./paso-03-auth-health.md) | [x] |
| 04 | [paso-04-catalogo-admin.md](./paso-04-catalogo-admin.md) | [x] |
| 05 | [paso-05-stock-purchasing.md](./paso-05-stock-purchasing.md) | [x] |
| 06 | [paso-06-pos-ventas-caja.md](./paso-06-pos-ventas-caja.md) | [x] |
| 07 | [paso-07-usuarios-empresa-dashboard.md](./paso-07-usuarios-empresa-dashboard.md) | [x] |
| 08 | [paso-08-ui-switch-commands.md](./paso-08-ui-switch-commands.md) | [x] |
| 09 | [paso-09-quitar-sidecar.md](./paso-09-quitar-sidecar.md) | [x] |
| 10 | [paso-10-packaging-slim.md](./paso-10-packaging-slim.md) | [x] |

Al cerrar un paso: marcar Done aquí + tests en [../pruebas/matriz-metodos.md](../pruebas/matriz-metodos.md).

## Notas de implementación (2026-09)

- Schema sqlx **Option B**: DB fresca + seed (no clone 1:1 TypeORM). Credenciales seed: `admin`/`admin1234`, `cajero`/`cajero1234`.
- S4: sin sidecar; UI siempre `liteFetch` → `invoke("lite_*")`.
- Tests: `cd src-tauri && cargo test lite_`
