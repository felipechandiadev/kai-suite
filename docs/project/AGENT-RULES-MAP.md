# Mapa — dónde lee el agente IA

Referencia rápida para onboarding con Cursor u otros agentes.

| Fuente | Rol | Estado |
|--------|-----|--------|
| `.cursor/rules/kai-platform.mdc` | Reglas monorepo Kai | **Principal** |
| `pwa-admin/AGENTS.md` | Reglas app admin | Activo |
| `pwa-pos/AGENTS.md` | Reglas app POS | Activo |
| `pwa-eshop/AGENTS.md` | Reglas eShop | Activo |
| `.instructions/backend.instruction` | CQRS NestJS | Deprecated → usar `.cursor/rules` |
| `.instructions/webadmin.instruction` | Server Actions admin | Deprecated → usar `.cursor/rules` |
| `docs/project/PWA-ICONOS-Y-FAVICONS.md` | Iconos PWA + favicons | Activo |
| `docs/apps/NAMING-SUITE.md` | Naming suite: labels e ids PWA + nativos | Activo |
| `docs/apps/PRODUCTOS-Y-APPS.md` | Productos × apps, topbar, `companies.kai_product` | Activo |
| `docs/apps/MANIFESTOS-PWA.md` | Manifiestos PWA: short_name, id, estado vs estándar | Activo |
| `docs/apps/MANIFESTOS-NATIVOS.md` | Manifiestos nativos Android/Tauri | Activo |
| `docs/apps/SERVICE-WORKERS.md` | Service workers PWA: caches, offline, push | Activo |
| `docs/apps/RELEASE-MANIFESTS.md` | Release manifests de descarga de agentes | Activo |
| `docs/apps/SERVICES-SIDECARS.md` | Sidecars `services/` + migración OSRM | Activo |
| `docs/apps/VERSIONS.md` | Versiones: root siempre + apps tocadas; SemVer | Activo |
| `.cursor/rules/versioning.mdc` | Agentes: clasificar upgrade; bump root + apps | Activo |
| `docs/legacy/*INSTRUCTIONS*` | Histórico | Solo referencia |
| `~/.cursor/skills-cursor/` | Skills usuario | Fuera del repo |

## Migración

Ver [`MIGRACION-NOMBRES-KAISTORE.md`](./MIGRACION-NOMBRES-KAISTORE.md) fase F10.
