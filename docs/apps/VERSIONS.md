# Versiones por app — plan y reglas

Política SemVer del monorepo **kai-suite**: el agente **clasifica el tipo de upgrade** (PATCH / MINOR / MAJOR), **siempre** actualiza la versión del **root**, y solo bumpea los `package.json` (u otras fuentes) de las **apps realmente tocadas**.

**Última revisión:** julio 2026  
**Política corta:** [`../project/VERSIONING.md`](../project/VERSIONING.md) · **F8:** [`MIGRACION-NOMBRES-KAISTORE.md`](../project/MIGRACION-NOMBRES-KAISTORE.md) · **Release nativos:** [`RELEASE-MANIFESTS.md`](./RELEASE-MANIFESTS.md) · **Regla Cursor:** [`.cursor/rules/versioning.mdc`](../../.cursor/rules/versioning.mdc)

---

## 1. Principios (dos capas)

1. **Root (monorepo)** — campo `version` en el [`package.json`](../../package.json) de la raíz: se actualiza en **cada commit** (reloj del suite).
2. **Apps / servicios / paquetes** — se actualiza **solo** si el diff toca ese componente (inteligente; nunca “todas las apps”).
3. El agente **debe identificar el tipo** de upgrade (PATCH / MINOR / MAJOR) antes de escribir números.
4. Fuente de verdad por componente: `package.json` / `version.properties` / `tauri.conf.json` — no hardcodear en UI.
5. Breaking de API o protocolo WS → tipo **MAJOR** + avisar release **coordinado**.

### Capas

| Capa | Archivo | ¿Cuándo bump? |
|------|---------|----------------|
| **Root monorepo** | `/package.json` → `version` | **Siempre** en cada commit |
| App PWA / Core / sidecar / `@kai/*` | `<app>/package.json` → `version` | Solo si el path de esa app está en el diff (y el cambio es shippable) |
| Agente nativo | `version.properties` / Tauri | Solo si ese agente cambió |
| Metadata de build | git sha / `NEXT_PUBLIC_BUILD_ID` | CI; no es SemVer de producto |
| Release manifest (tipo B) | `*.manifest.json` en downloads | Tras publish del agente |

---

## 2. Clasificar el tipo de upgrade

Antes de editar cualquier `version`, el agente elige **un tipo por commit** (para el root) y, si aplica, **un tipo por app** (puede coincidir o ser más bajo que el root, nunca más alto que el impacto real de esa app).

| Tipo | Cuándo | Ejemplo |
|------|--------|---------|
| **PATCH** `x.y.Z` | Docs, seeds, chore, formateo, bugfix, copy, ajuste menor sin API nueva | Fix UI POS; solo docs |
| **MINOR** `x.Y.0` | Feature hacia atrás compatible; API nueva no breaking | Nueva pantalla admin + endpoint |
| **MAJOR** `X.0.0` | Breaking (API, storage, protocolo WS, contrato print) | Cambio incompatible de WS printers |

### Regla del root cuando hay varios impactos

Si el commit toca varias cosas con tipos distintos, el **root** usa el **máximo**:

`MAJOR` > `MINOR` > `PATCH`

Cada app bumpea solo según **su** impacto (p. ej. root MINOR porque hubo feature en admin; `pwa-pos` no se toca si no hubo diff ahí).

### Matriz rápida

| Diff | Tipo root | Apps a bumpear |
|------|-----------|----------------|
| Solo `docs/…`, comentarios, formateo | **PATCH** | Ninguna |
| Solo `seeds/…` demo | **PATCH** | Ninguna (salvo script de producto versionado) |
| Fix UI en `pwa-pos` | **PATCH** | Solo `pwa-pos/package.json` |
| Feature admin + endpoint Core | **MINOR** | `backend` + `pwa-admin` |
| Cambio solo `packages/ui` | **MINOR** o **PATCH** según alcance | `@kai/ui`; PWAs solo si cambio visible/breaking y se redeployan |
| Ticket / protocol printers | Según impacto | Android/desktop (+ publish); POS solo si cambia UI descarga |
| Breaking API | **MAJOR** | Core + consumidores afectados; avisar coordinación |

---

## 3. Matriz viva — versiones actuales

Baseline; actualizar en bumps notables o PRs de release.

### 3.0 Root

| Archivo | Versión | Notas |
|---------|---------|--------|
| `/package.json` (monorepo) | **1.2.0** | Reloj del suite; bump en **cada** commit |

### 3.1 Clientes web (PWA)

| Carpeta | Versión | Fuente |
|---------|---------|--------|
| `pwa-admin` | **1.3.3** | `package.json` |
| `pwa-pos` | **1.0.0** | `package.json` |
| `pwa-stock` | **1.0.0** | `package.json` |
| `pwa-eshop` | **1.1.0** | `package.json` |
| `kai-delivery` | **1.1.0** | `package.json` |
| `kai-waiter` | **1.1.0** | `package.json` |
| `kai-kds` | **1.1.0** | `package.json` |
| `kai-board` | **1.1.0** | `package.json` |

### 3.2 Core, landing, sidecars

| Carpeta | Versión | Notas |
|---------|---------|--------|
| `backend` (Kai Core) | **1.0.1** | `name`: `flow-backend` legado |
| `landing` | **1.1.0** | |
| `services/kai-mail` | **1.1.0** | Workspace npm |
| `services/kai-voice` | **1.1.0** | Python; `package.json` como marca |

### 3.3 Agentes nativos

| Carpeta | Versión | Fuente |
|---------|---------|--------|
| `kai-printers-android` | **1.1.14** (code **24**) | `version.properties` |
| `kai-printers-desktop` | **1.0.7** | `package.json` + `tauri.conf.json` |
| `kai-screen-android` (Kai CFD) | **1.2.0** (code **5**) | `version.properties` |

### 3.4 Paquetes internos (muestra)

| Paquete | Versión |
|---------|---------|
| `@kai/ui` | **1.1.0** |
| `@kai/print-service-client` | **1.0.1** |
| `@kai/customer-display-client` | **1.0.1** |
| `@kai/fiscal-ted` | **1.0.1** |
| `@kai/document-print` | **1.0.1** |
| `@kai/scale-service-client` | **1.0.1** |
| `@kai/barcode-scanner` | **1.0.1** |
| `@kai/chile-catalogs` | **1.0.1** |
| `seeds` | **1.0.1** |

---

## 4. Mapa path → componente (apps)

| Prefijo de path | Componente (`version` a editar) |
|-----------------|----------------------------------|
| `pwa-admin/` | `pwa-admin/package.json` |
| `pwa-pos/` | `pwa-pos/package.json` |
| `pwa-stock/` | `pwa-stock/package.json` |
| `pwa-eshop/` | `pwa-eshop/package.json` |
| `kai-delivery/` | `kai-delivery/package.json` |
| `kai-waiter/` | `kai-waiter/package.json` |
| `kai-kds/` | `kai-kds/package.json` |
| `kai-board/` | `kai-board/package.json` |
| `backend/` | `backend/package.json` |
| `landing/` | `landing/package.json` |
| `services/kai-mail/` | `services/kai-mail/package.json` |
| `services/kai-voice/` | `services/kai-voice/package.json` |
| `kai-printers-android/` | `version.properties` (+ code) |
| `kai-printers-desktop/` | `package.json` + `tauri.conf.json` |
| `kai-screen-android/` | `version.properties` |
| `packages/<name>/` | `packages/<name>/package.json` |
| `docs/`, `envs/`, `deploy/` (solo docs/config) | **Ninguna app** — solo root PATCH |

Siempre, además: **`/package.json`** → `version` (root).

---

## 5. Inyección y visibilidad

| Canal | Cómo se expone |
|-------|----------------|
| PWAs | `NEXT_PUBLIC_APP_VERSION` desde su `package.json` |
| Core | `GET /api/health` → `version` del backend |
| Root | Marca del monorepo / release notes; no sustituye la versión de cada PWA en About |
| Nativos | `versionName` / Tauri + manifests de download |

---

## 6. Flujo obligatorio del agente al commit

Cuando el usuario pida **crear un commit**:

1. **Clasificar** el tipo global del commit (PATCH / MINOR / MAJOR) §2.
2. **Bump root:** editar `/package.json` → `version` (siempre).
3. **Listar** paths del diff → mapear a componentes §4.
4. **Por cada componente tocado** con cambio shippable (o, si es solo docs, ninguno):
   - Elegir tipo de esa app (≤ impacto real).
   - Editar **solo** su `package.json` (campo `version`) u otra fuente nativa.
5. **Incluir** esos archivos de versión en el **mismo commit**.
6. Si MAJOR: avisar coordinación; no fingir PATCH en consumidores rotos.
7. Opcional: actualizar matriz §3 de este doc en bumps notables.

**Prohibido:**

- Bumpear todas las PWAs “por las dudas”.
- Bumpear apps sin paths en el diff.
- Omitir el bump del root.
- Subir versión de app por docs-only / formateo (el root sí, PATCH).

---

## 7. Checklist

### Cada commit

- [ ] Tipo de upgrade identificado (PATCH / MINOR / MAJOR)
- [ ] `/package.json` `version` actualizado
- [ ] Solo `package.json` (o nativo) de apps en el diff, si aplica
- [ ] Mismo commit que el cambio de código

### Release / deploy de una app

- [ ] Versión de esa app coherente con lo desplegado
- [ ] Nativos: publish + release manifests si corresponde

---

## 8. Gaps

| Gap | Notas |
|-----|--------|
| Core `name` `flow-backend` | Rename package name en migración `kai-core` |
| About hardcodeado (histórico F8) | Eliminar fallbacks; solo `NEXT_PUBLIC_APP_VERSION` / health |
| Hook CI opcional | Avisar si hay diff de app sin cambio de su `version` |

---

## 9. Resumen

| Pregunta | Respuesta |
|----------|-----------|
| ¿Root en cada commit? | **Sí** — siempre |
| ¿Apps? | **Solo las tocadas** + tipo correcto |
| ¿Quién elige PATCH/MINOR/MAJOR? | El **agente**, según el diff (§2) |
| ¿Dónde se escribe? | Root + `package.json` de cada app afectada (o `version.properties` / Tauri) |
| ¿Automatizado? | Vía regla Cursor al preparar el commit — no bumpear todo el monorepo de apps |
