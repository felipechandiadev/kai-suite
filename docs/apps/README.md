# Docs — Apps instalables Kai

Identidad, manifiestos, productos/verticales, sidecars y versionado del ecosistema cliente.

**Última revisión:** julio 2026

## Dos tipos de “manifest” (no confundir)

| Tipo | Qué es | Documento |
|------|--------|-----------|
| **A — Identidad / launcher** | Nombre en home/dock, id estable, iconos de app | [`NAMING-SUITE.md`](./NAMING-SUITE.md), [`MANIFESTOS-PWA.md`](./MANIFESTOS-PWA.md), [`MANIFESTOS-NATIVOS.md`](./MANIFESTOS-NATIVOS.md) |
| **B — Release / update** | Versión + archivo descargable para actualizar el agente | [`RELEASE-MANIFESTS.md`](./RELEASE-MANIFESTS.md) |

## Índice

| Documento | Contenido |
|-----------|-----------|
| [`STATUS.md`](./STATUS.md) | **Estado del épico** — fases pendientes / hechas |
| [`NAMING-SUITE.md`](./NAMING-SUITE.md) | **Tabla maestra** — labels, ids, **carpetas monorepo** (`kai-<slug>`) |
| [`PRODUCTOS-Y-APPS.md`](./PRODUCTOS-Y-APPS.md) | **Productos × apps**, topbar, esbozo `companies.kai_product` |
| [`MANIFESTOS-PWA.md`](./MANIFESTOS-PWA.md) | Web App Manifest: `short_name`, `id`, theme, fuente única |
| [`MANIFESTOS-NATIVOS.md`](./MANIFESTOS-NATIVOS.md) | Android / Tauri: `applicationId`, `app_name`, `productName`, iconos |
| [`RELEASE-MANIFESTS.md`](./RELEASE-MANIFESTS.md) | `kai-printers-*.manifest.json` / CFD (paths `kai-screen-*`) — versionado de descarga |
| [`SERVICE-WORKERS.md`](./SERVICE-WORKERS.md) | Runtime PWA: `/sw.js`, caches, offline, Web Push |
| [`SERVICES-SIDECARS.md`](./SERVICES-SIDECARS.md) | `services/` (mail, voice) + **tarea migrar OSRM** a `services/kai-osrm` |
| [`VERSIONS.md`](./VERSIONS.md) | **Versiones** — root en cada commit; apps solo tocadas; PATCH/MINOR/MAJOR |
| [`../project/PWA-ICONOS-Y-FAVICONS.md`](../project/PWA-ICONOS-Y-FAVICONS.md) | Set `any`/`maskable`, favicons, iOS |

## Mapa del ecosistema (instalables)

| Paquete | Canal | Rol |
|---------|-------|-----|
| `kai-admin` | PWA | ERP / backoffice |
| `kai-pos` | PWA | Caja / punto de venta |
| `kai-stock` | PWA | Inventario piso |
| `kai-eshop` | PWA | Tienda pública |
| `kai-delivery` | PWA | Repartidores |
| `kai-waiter` | PWA | Mesero / salón |
| `kai-kds` | PWA | Cocina (KDS) |
| `kai-board` | PWA | Monitor de pedidos |
| `kai-printers-android` | Nativo Android | Agente de impresión |
| `kai-printers-desktop` | Nativo Tauri (Win/macOS) | Agente de impresión |
| `kai-screen-android` | Nativo Android | **Kai CFD** (Customer Facing Display / visor de cliente) — label hoy “Kai Screen”, pendiente rename |
| `kai-core` → objetivo `kai-core` | API (Nest) | Producto **Kai Core** — rename de carpeta no urgente ([`NAMING-SUITE` §5.1](./NAMING-SUITE.md)) |

**Fuera de identidad de suite (clientes):** `landing` (sitio comercial). Infra: `packages/`, `seeds/`, `envs/`, `deploy/`. Sidecars: `services/` ([`SERVICES-SIDECARS.md`](./SERVICES-SIDECARS.md) — mail, voice, migración OSRM).

Migración de ruta: este contenido vivía en `docs/pwa/` → ahora **`docs/apps/`**.
