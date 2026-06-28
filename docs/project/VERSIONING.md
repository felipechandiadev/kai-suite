# Versionado — plataforma Kai

Política SemVer por app/servicio. Fuente de verdad: `package.json` de cada componente.

## Qué versiona cada nivel

| Nivel | Archivo / fuente | Ejemplo |
|-------|------------------|---------|
| App PWA | `pwa-*/package.json` | `1.2.3` |
| Backend | `backend/package.json` | `0.4.0` |
| Agente Android | `kai-printers-android/version.properties` | `1.0.2` / code `102` |
| Agente desktop | `kai-printers-desktop/src-tauri/tauri.conf.json` | semver Tauri |
| Paquetes `@kai/*` | `packages/*/package.json` | `0.1.0` |

## Inyección en PWAs

Todas las PWAs exponen `NEXT_PUBLIC_APP_VERSION` desde su `next.config.ts` (lectura de `package.json`).

Opcional en CI: `NEXT_PUBLIC_BUILD_ID` (git sha corto).

## Backend

`GET /api/health` incluye `version` leída de `backend/package.json`.

## Incremento

- **PATCH** — fix en una app → solo esa versión.
- **MINOR** — feature backend + consumidores → backend + PWAs afectadas.
- **MAJOR** — breaking (storage, protocolo WS, API) → release coordinado.

Ver [`MIGRACION-NOMBRES-KAISTORE.md`](./MIGRACION-NOMBRES-KAISTORE.md) § F8.
