# KaiStore Lite — backend Rust (sqlx)

Track de migración: **eliminar el sidecar Node** y ejecutar la lógica Lite **in-process** en Tauri con **sqlx + SQLite**.

## Por qué

El sidecar Nest/TypeORM funciona, pero el empaquetado (Chromebook/Crostini) arrastra Node + `node_modules` (~400 MB), symlinks rotos, glibc y permisos (`logs/` en `/usr/lib`). Un backend Rust reduce el instalador a un binario + SQLite.

## Decisión ORM

**sqlx** (no SeaORM / Diesel / TypeORM).

- TypeORM solo existe en Node; no cabe “dentro” de Tauri Rust.
- sqlx: consultas SQL tipadas, migraciones, SQLite maduro, tests con DB real.

Detalle: [00-decisiones.md](./00-decisiones.md).

## Cómo leer

| Orden | Doc | Contenido |
|------:|-----|-----------|
| 1 | [00-decisiones.md](./00-decisiones.md) | ORM, auth, coexistencia, fuera de alcance |
| 2 | [01-arquitectura-objetivo.md](./01-arquitectura-objetivo.md) | Diagrama commands ↔ repos ↔ SQLite |
| 3 | [02-inventario-api-lite.md](./02-inventario-api-lite.md) | Mapa Nest `/api/lite/*` → `invoke` Rust |
| 4 | [03-schema-sqlite.md](./03-schema-sqlite.md) | Tablas mínimas + migraciones |
| 5 | [04-estrategia-migracion.md](./04-estrategia-migracion.md) | Feature flag sidecar vs rust |
| 6 | [05-plan-pruebas.md](./05-plan-pruebas.md) | Niveles de test + criterios |
| 7 | [pasos/](./pasos/README.md) | Paso a paso 01–10 |
| 8 | [pruebas/](./pruebas/README.md) | Matriz de métodos + fixtures |

## Estado

| Ítem | Estado |
|------|--------|
| Documentación de planificación | Lista (sqlx recomendado) |
| Código sqlx / commands | Implementado (pasos 01–10) |
| Sidecar Node | **Eliminado (S4)** — sin spawn, sin `resources/sidecar`, sin scripts `stage:sidecar:*` |
| Runtime | Solo `invoke("lite_*")` → sqlx in-process |

## Relación con la guía existente

Contrato HTTP histórico (referencia Nest):

- [guia/04-api-core-lite.md](../guia/04-api-core-lite.md)
- [guia/modulos/mod-core-lite.md](../guia/modulos/mod-core-lite.md)
- [04-arquitectura.md](../04-arquitectura.md) (actualizado a in-process sqlx)
