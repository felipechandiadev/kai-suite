# KaiStore Lite

Edición de escritorio (**Apple Silicon** / **Windows x64**) de **Kai Store** para un solo negocio pequeño.

Una app Tauri: **POS + Admin + Impresoras** en la misma ventana. Core Lite (SQLite). UI `@kai/ui`. Sin multi-empresa, sin RRHH, sin eShop/Food y **sin SII**.

**Admin acotado (ventas-only):** Ventas (Transacciones / POS único / Sesiones de caja) · Inventario (Catálogo / Categorías / Atributos / Unidades / Almacenes / Existencias) · Reportes (Resumen / Ventas) · Config (Empresa / Usuarios / Impresión / Backup / Acerca de). Sin compras ni clientes en UI; el stock entra por **ajuste de existencias** (+ seed). Impresión = tickets de venta.

**Licencia:** trial **10 días** sin activar; licencia comercial **perpetua** atada a la máquina (emisión por script). Installers: **DMG** + **MSI**.

## Cómo levantar la app (todo en uno)

**Un solo comando** — ventana Tauri + Core Lite en `:4100` (no abras Vite en el navegador):

```bash
cd kai-store-lite
npm run tauri:dev
```

- Tauri arranca el **sidecar Node** (`lite-entrypoint.mjs` → `kai-core/dist/main.js`).
- La SQLite vive en `~/Library/Application Support/KaiStore Lite/business.sqlite` (macOS).
- Si Core falla, revisa el log: `~/Library/Application Support/KaiStore Lite/core-lite-sidecar.log`.
- La primera vez compila `kai-core` automáticamente (`pretauri:dev`).

Seed (desde Admin → Acerca de o Usuarios): `admin` / `admin1234` · `cajero` / `cajero1234`.

### Smoke rápido (Admin)

1. Seed → Existencias → ajustar stock de un PHYSICAL.
2. POS → abrir caja → vender → cobrar (efectivo/tarjeta/transferencia).
3. Admin → Transacciones → ver la venta.

### Solo para desarrollo UI (opcional)

Si quieres el navegador sin Tauri (no es el flujo normal):

```bash
node scripts/lite-entrypoint.mjs   # terminal 1
npm run dev                        # terminal 2 → http://localhost:1421
```

## Release

```bash
npm run tauri:build:mac      # DMG
npm run tauri:build:windows  # MSI
npm run issue-license
npm run package:release
```

## Documentación

[`doc/README.md`](./doc/README.md) · guía: [`doc/guia/`](./doc/guia/README.md) · rutas Admin: [`doc/guia/01-rutas-admin.md`](./doc/guia/01-rutas-admin.md)
