# Paso 02 — Migraciones y schema

## Objetivo

Definir e incrustar migraciones sqlx; inspeccionar DB TypeORM Lite real para alinear nombres de columnas.

## Tareas

1. Inspeccionar `business.sqlite` de una instalación Lite (`.schema` / entidades TypeORM usadas por Lite).
2. Escribir migraciones `001`–`005` según [../03-schema-sqlite.md](../03-schema-sqlite.md).
3. `sqlx::migrate!` o folder `migrations/` cargado al abrir pool.
4. Helper de test `lite_test_pool()` aplica migraciones en tempfile.

## Criterios de done

- [ ] Migraciones aplican en DB vacía  
- [ ] `lite_test_pool` usable desde tests  
- [ ] Diff documentado vs schema TypeORM (si hay renombres)  

## Tests obligatorios

| id | Caso |
|----|------|
| `lite_migrate_empty_ok` | migrate sobre archivo nuevo |
| `lite_migrate_idempotent` | segunda apply no rompe |
