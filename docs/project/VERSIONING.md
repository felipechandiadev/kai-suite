# Versionado — plataforma Kai

Política SemVer en dos capas. Detalle completo: **[`docs/apps/VERSIONS.md`](../apps/VERSIONS.md)**.

## Capas

| Nivel | Archivo | Cuándo bump |
|-------|---------|-------------|
| **Root monorepo** | `/package.json` → `version` | **Cada commit** |
| App PWA | `pwa-*/package.json` · `kai-*/package.json` | Solo si esa app cambió |
| Backend (Kai Core) | `backend/package.json` | Solo si Core cambió |
| Agente Android | `*/version.properties` | Solo si ese agente cambió |
| Agente desktop | `tauri.conf.json` + `package.json` | Solo si desktop cambió |
| Paquetes `@kai/*` | `packages/*/package.json` | Solo si el paquete cambió |
| Sidecars | `services/*/package.json` | Solo si el sidecar cambió |

## Tipo de upgrade (obligatorio clasificar)

- **PATCH** — docs, chore, fix, ajuste menor  
- **MINOR** — feature compatible  
- **MAJOR** — breaking (API, storage, protocolo)

El root toma el **máximo** entre los impactos del commit. Cada app solo su impacto.

## Inyección en PWAs

`NEXT_PUBLIC_APP_VERSION` desde el `package.json` de **esa** PWA (no desde el root).

## Backend

`GET /api/health` → `version` de `backend/package.json`.

## Agentes

Al commit: ver `.cursor/rules/versioning.mdc` y [`VERSIONS.md`](../apps/VERSIONS.md) §6.

Ver [`MIGRACION-NOMBRES-KAISTORE.md`](./MIGRACION-NOMBRES-KAISTORE.md) § F8.
