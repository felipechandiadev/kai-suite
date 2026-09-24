# 05 — Plan de pruebas

## Niveles

| Nivel | Dónde | Qué |
|-------|-------|-----|
| Unit | `cargo test` | Reglas puras (totales, validaciones) |
| Integration | `cargo test` + SQLite temp | Cada método application/repo |
| Command | `cargo test` wrappers | serde round-trip + auth header simulado |
| Smoke UI | Checklist manual / doc | Flujos POS+Admin |

## Regla de cobertura por método

Para **cada** fila del inventario ([02-inventario-api-lite.md](./02-inventario-api-lite.md)):

1. **Happy path** (≥1)  
2. **Error path** (≥1): 401/404/validación  

Críticos (sale, void, stock adjust/transfer, cash open/close): **+1** invariante (stock/caja).

## Naming

```text
lite_<dominio>_<accion>_<caso>
```

Ejemplos: `lite_pos_sale_ok`, `lite_pos_sale_no_session`, `lite_admin_sales_void_bad`.

## Cómo correr

```bash
cd kai-store-lite/src-tauri
cargo test lite_ -- --nocapture
```

CI (futuro): job sin Node, solo `cargo test`.

## Fixtures

Ver [pruebas/fixtures.md](./pruebas/fixtures.md). Helper obligatorio: `lite_test_pool()` aplica migraciones + seed.

## Definition of Done de un paso

- Commands del paso registrados en `tauri::generate_handler!`  
- Tests de la matriz de ese paso en verde  
- Checkbox del paso marcado en [pasos/README.md](./pasos/README.md)
