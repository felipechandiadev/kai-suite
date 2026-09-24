# KaiStore Lite

Edición de escritorio (**Apple Silicon** / **Windows x64** / **Linux x64**) de **Kai Store** para un solo negocio pequeño.

Una app Tauri: **POS + Admin + Impresoras** en la misma ventana. Backend Lite **in-process** (Rust + sqlx + SQLite). UI `@kai/ui`. Sin multi-empresa, sin RRHH, sin eShop/Food y **sin SII**.

**Admin acotado (ventas-only):** Ventas (Transacciones / POS único / Sesiones de caja) · Inventario (Catálogo / Categorías / Atributos / Unidades / Almacenes / Existencias) · Reportes (Resumen) · Config (Empresa / Usuarios / Impresión / Backup / Acerca de). Sin compras ni clientes en UI; el stock entra por **ajuste de existencias** (+ seed). Impresión = tickets de venta.

**Licencia:** trial **10 días** sin activar; licencia comercial **perpetua** atada a la máquina (emisión por script). Installers: **DMG** + **MSI** / portable + **DEB**.

## Cómo levantar la app (todo en uno)

**Un solo comando** — ventana Tauri + backend sqlx (no abras Vite en el navegador):

```bash
cd kai-store-lite
npm run tauri:dev
```

- Backend Lite es **in-process** (`invoke("lite_*")` → sqlx); no hay sidecar Node ni puerto `:4100`.
- La SQLite vive en `~/Library/Application Support/KaiStore Lite/business.sqlite` (macOS) / AppData (Windows) / `~/.local/share/KaiStore Lite/` (Linux).
- Splash espera `lite_health` antes de mostrar la UI.

Seed (desde Admin → Acerca de o Usuarios): `admin` / `admin1234` · `cajero` / `cajero1234`.

### Smoke rápido (Admin)

1. Seed → Existencias → ajustar stock de un PHYSICAL.
2. POS → abrir caja → vender → cobrar (efectivo/tarjeta/transferencia).
3. Admin → Transacciones → ver la venta.

### Solo UI en navegador (opcional)

Vite sin Tauri no tiene backend (`liteFetch` no funciona fuera de la app). Usá `npm run tauri:dev`.

## Release

```bash
npm run tauri:build:mac           # DMG
npm run tauri:build:windows       # MSI (Windows) o portable zip (cross)
npm run tauri:build:linux:docker  # DEB bookworm (desde macOS)
npm run issue-license
npm run package:release
```

## Documentación

[`doc/README.md`](./doc/README.md) · guía: [`doc/guia/`](./doc/guia/README.md) · rust-lite: [`doc/rust-lite/`](./doc/rust-lite/README.md)
