# Documentación — Kai Platform

| Documento | Descripción |
|-----------|-------------|
| [project/MIGRACION-NOMBRES-KAISTORE.md](./project/MIGRACION-NOMBRES-KAISTORE.md) | Plan migración **Flow Store → Kai** |
| [project/ARQUITECTURA_Y_ECOSISTEMA.md](./project/ARQUITECTURA_Y_ECOSISTEMA.md) | Arquitectura monorepo Kai |
| [project/PWA-ICONOS-Y-FAVICONS.md](./project/PWA-ICONOS-Y-FAVICONS.md) | Manual iconos PWA (`any`/`maskable`) + favicons |
| [apps/NAMING-SUITE.md](./apps/NAMING-SUITE.md) | Naming suite — labels e ids (PWA + nativos) |
| [apps/MANIFESTOS-PWA.md](./apps/MANIFESTOS-PWA.md) | Manifiestos PWA — `short_name`, `id`, estado vs estándar |
| [apps/MANIFESTOS-NATIVOS.md](./apps/MANIFESTOS-NATIVOS.md) | Manifiestos nativos — Android / Tauri |
| [apps/SERVICE-WORKERS.md](./apps/SERVICE-WORKERS.md) | Service workers — caches, offline, Web Push |
| [apps/SERVICES-SIDECARS.md](./apps/SERVICES-SIDECARS.md) | Sidecars `services/` + migración OSRM |
| [apps/VERSIONS.md](./apps/VERSIONS.md) | Versiones — root siempre; apps solo tocadas; PATCH/MINOR/MAJOR |
| [project/VERSIONING.md](./project/VERSIONING.md) | Política de versiones |
| [project/AGENT-RULES-MAP.md](./project/AGENT-RULES-MAP.md) | Dónde lee el agente IA |

## Documentación comercial (ventas / marketing)

→ **[sales/](./sales/README.md)** — qué es Kai, propuesta de valor, ecosistema, módulos, SII, FAQ y glosario.

→ **[landing/](../landing/)** — sitio Astro de producto (deploy comercial).

## Documentación viva

| Documento | Descripción |
|-----------|-------------|
| [assets/README.md](../assets/README.md) | Assets estáticos — marca Kai (`assets/brand/`) e integraciones |
| [project/MIGRACION-NOMBRES-KAISTORE.md](./project/MIGRACION-NOMBRES-KAISTORE.md) | Plan de migración **Flow Store → Kai** (plataforma: KaiStore, KaiFood, KaiServices) |
| [project/ARQUITECTURA_Y_ECOSISTEMA.md](./project/ARQUITECTURA_Y_ECOSISTEMA.md) | Arquitectura, ecosistema, dominios de negocio y flujos principales |
| [project/PWA-ICONOS-Y-FAVICONS.md](./project/PWA-ICONOS-Y-FAVICONS.md) | Iconos de instalación PWA vs favicon — estándar, checklist y estado por app |
| [apps/](./apps/README.md) | **Apps** — naming, manifiestos, SW, sidecars, **versiones** |
| [project/MODULOS_Y_SERVICIOS_BACKEND.md](./project/MODULOS_Y_SERVICIOS_BACKEND.md) | Catálogo detallado de módulos, servicios y rutas REST del backend |
| [printers/](./printers/README.md) | **Impresión POS** — estrategia, arquitectura, renderers ESC/POS, postmortem venta real |
| [pos/](./pos/README.md) | **POS offline** — plan MVP venta + boleta con folios por POS |
| [SII/](./SII/README.md) | **SII** — OpenAPI, certificación, hub admin (`/settings/sii`), ambientes |
| [project/inconsistencias/](./project/inconsistencias/README.md) | Auditoría doc vs código — índice + detalle por inconsistencia (INC-01 … INC-17) |
| [implementaciones-futuras/](./implementaciones-futuras/README.md) | Iniciativas planificadas (IF-XX) y [roadmap de tareas](./implementaciones-futuras/ROADMAP.md) |
| [produccion/](./produccion/README.md) | **Producción** — tipos de producto, recetas, PMP, flujo y unidades de producción |
| [kai-food/](./kai-food/README.md) | **KaiFood** — gastronomía, salón/mesas, kai-waiter, kai-kds, modalidad `kaifood` |
| [kai-services/](./kai-services/README.md) | **KaiServices** — lavandería, guías de recepción, modalidad `kaiservices` |
| [hr/](./hr/README.md) | **RRHH** — empleados, remuneraciones y documento de trabajo **Jornada** (turnos / cumplimiento) |

## Documentación legacy

Guías detalladas, análisis competitivos, especificaciones históricas e instrucciones para agentes:

→ [legacy/](./legacy/)

Instrucciones activas para desarrollo diario también en:

- `.instructions/backend.instruction`
- `.instructions/webadmin.instruction`
- `pwa-admin/AGENTS.md`, `pwa-pos/AGENTS.md`, `pwa-eshop/AGENTS.md`
