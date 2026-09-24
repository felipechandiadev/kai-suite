# Pruebas — backend Rust Lite (sqlx)

## Objetivo

Cubrir **cada** command del inventario con happy + error path antes de marcar el paso Done.

## Documentos

| Doc | Uso |
|-----|-----|
| [matriz-metodos.md](./matriz-metodos.md) | Checklist por método (ids de `cargo test`) |
| [fixtures.md](./fixtures.md) | Seed mínimo y helpers |
| [../05-plan-pruebas.md](../05-plan-pruebas.md) | Niveles y DoD |

## Cómo correr

```bash
cd kai-store-lite/src-tauri
cargo test lite_ -- --nocapture
```

Filtro por paso (ejemplo auth):

```bash
cargo test lite_auth_ -- --nocapture
cargo test lite_health -- --nocapture
```

## Smoke manual (paso 08+)

Runtime siempre sqlx in-process (sin flag):

1. Abrir app → splash → health OK (`edition: lite-rust`).
2. Login `admin` / `admin1234`.
3. Abrir sesión de caja.
4. POS: búsqueda catálogo (`/lite/pos/catalog`) carga paginado.
5. Venta simple (`/lite/pos/sale`) → ticket print (opcional).
6. Admin recepciones (`/lite/purchasing/receptions`) + stock↑.
7. Void venta / cierre de caja.
8. Reportes de ventas: mensaje “no disponible” (fuera de v1).

Marcar cada ítem en la matriz columna **Smoke** cuando aplique.
