# Paso 04 — Catálogo admin + catálogo POS

## Objetivo

CRUD productos/variantes/pack/units/storages/categories/attributes + listado POS catalog (paginado si aplica).

## Commands

Prefijo `lite_admin_*` y `lite_pos_catalog` (inventario filas 5, 7–20).

## Criterios de done

- [ ] Paridad de payloads con DTOs Lite actuales (campos usados por UI)  
- [ ] Delete categoría/atributo con reglas (FK) documentadas  

## Tests

Happy + error por cada acción CRUD listada en matriz para paso 04.
