# Manifiestos nativos — Android y Desktop

Identidad de instalación de agentes nativos Kai (no Web App Manifest). Complementa [`NAMING-SUITE.md`](./NAMING-SUITE.md).

**Última revisión:** julio 2026  
**Audiencia:** mobile/desktop, release, agentes IA.  
**Relacionado:** [`RELEASE-MANIFESTS.md`](./RELEASE-MANIFESTS.md), [`PUBLISH-CHECKLIST`](../../packages/kai-printers-release/PUBLISH-CHECKLIST.md), iconos en [`PWA-ICONOS` / kai-brand](../project/PWA-ICONOS-Y-FAVICONS.md).

---

## 1. Objetivo

1. Labels de launcher **homologados** entre Android y Desktop de la misma familia.
2. **`applicationId` / `identifier` estables** (no cambiar sin migración).
3. Iconos adaptativos / bundle coherentes con la marca Kai.
4. Separar identidad (este doc) de manifests de **descarga/versión** (tipo B).

---

## 2. Apps en alcance

| Paquete | Plataforma | Fuentes de identidad |
|---------|------------|----------------------|
| `kai-printers-android` | Android | `app/build.gradle.kts` (`applicationId`), `res/values/strings.xml` (`app_name`), `AndroidManifest.xml` |
| `kai-printers-desktop` | Windows / macOS (Tauri 2) | `src-tauri/tauri.conf.json` (`productName`, `identifier`, `app.windows[].title`, `bundle.icon`) |
| `kai-screen-android` | Android | Igual patrón que Printers Android |

---

## 3. Estado actual vs objetivo

### 3.1 Kai Printers — Android

| Campo | Hoy | Objetivo |
|-------|-----|----------|
| `applicationId` | `com.kaistore.kaiprinters` | Mantener |
| `app_name` | `Kai Printers` | Mantener |
| Label en `AndroidManifest` | `@string/app_name` | Mantener |
| Iconos | mipmap / adaptive del módulo | Alinear con pipeline `kai-brand` cuando se unifique |

### 3.2 Kai Printers — Desktop (Tauri)

| Campo | Hoy | Objetivo | Gap |
|-------|-----|----------|-----|
| `identifier` | `com.kaistore.kaiprinters` | Mantener (misma familia que Android) | — |
| `productName` | `KaiPrinters` | **`Kai Printers`** | Sin espacio vs Android |
| Título ventana | `KaiPrinters` | `Kai Printers` | Idem |
| `bundle.icon` | 32, 128, @2x, icns, ico | Mantener set; regenerar desde marca | — |
| Tray | `tray-icon.png` | Mantener | — |

**Nota:** cambiar `productName` afecta nombre de artefactos / carpeta de instalación en algunos targets — coordinar con script `kai-printers:publish` y nombres en `public/downloads/`.

### 3.3 Kai CFD (paquete `kai-screen-android`) — Android

Rol de industria: **Customer Facing Display (CFD)** · en es-CL: visor de cliente / pantalla secundaria.

| Campo | Hoy | Objetivo |
|-------|-----|----------|
| `applicationId` | `com.kaistore.kaiscreen` | **Mantener** (id legado; no forzar `…kaicfd` sin migración) |
| `app_name` | `Kai Screen` | **`Kai CFD`** — **debe cambiarse** |
| Copy settings POS / ofertas de descarga | “Kai Screen”, “pantalla cliente” | “Kai CFD” + subtítulo *Visor de cliente* donde ayude al cajero |

Ver decisión completa: [`NAMING-SUITE.md` §2.3](./NAMING-SUITE.md).

---

## 4. Estándar nativo Kai

### 4.1 Ids

```
com.kaistore.<slug>
```

| Slug | App |
|------|-----|
| `kaiprinters` | Printers (Android + Desktop comparten id de familia) |
| `kaiscreen` | **Kai CFD** (label objetivo; slug/id legado “screen”) |

No usar `com.kai.*` ni ids por vertical (`kaifood`): los agentes son de plataforma.

### 4.2 Labels

- Formato: **`Kai <Rol>`** con espacio (legible en launcher).
- Rol en inglés de producto: `Printers`, **`CFD`** (Customer Facing Display). No usar “Screen” como label nuevo.
- UI interna (es-CL): puede decir “visor de cliente” / “pantalla cliente” junto a la marca Kai CFD.
- Longitud: razonable para Android (&lt; ~30); no aplica el límite 12 de PWA `short_name`, pero conviene corto.

### 4.3 Iconos

| Plataforma | Requisito |
|------------|-----------|
| Android | Adaptive icon (foreground + background); no un solo PNG squircle hardcodeado si el SO enmascara |
| Desktop | Set Tauri (`icon.icns`, `icon.ico`, PNG 32/128) + tray monocromático/legible |

Fuente de diseño: misma familia visual que PWAs (`assets/brand/…`). Detalle de generación: doc de iconos + `packages/kai-brand`.

### 4.4 Qué no va aquí

- Capacidades de impresión / protocol (`print-service-client`) — docs de printers.
- Web Push / service workers — solo PWA ([`SERVICE-WORKERS.md`](./SERVICE-WORKERS.md)).
- JSON de versión en `pwa-pos/public/downloads/*.manifest.json` — [`RELEASE-MANIFESTS.md`](./RELEASE-MANIFESTS.md).

---

## 5. Matriz de gaps

| Prioridad | Gap | Acción |
|-----------|-----|--------|
| P1 | Desktop `productName` / título ≠ Android `Kai Printers` | Homologar a `Kai Printers` + verificar publish scripts |
| P1 | Label `Kai Screen` → **`Kai CFD`** | Cambiar `app_name` + copy POS/landing; no tocar `applicationId` |
| P2 | Icon pipeline nativo vs `brand:icons` | Documentar/generar desde misma fuente SVG |
| P3 | CFD sin variante desktop | N/A hasta existir producto |

---

## 6. Checklist (nueva app nativa o rename)

- [ ] `applicationId` / `identifier` en tabla [`NAMING-SUITE.md`](./NAMING-SUITE.md)
- [ ] `app_name` / `productName` = label objetivo
- [ ] Iconos de store/launcher + (Android) adaptive
- [ ] Si se descarga desde POS/admin: release manifest tipo B
- [ ] No reutilizar id de otra app Kai
