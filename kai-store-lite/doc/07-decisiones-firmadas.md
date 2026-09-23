# 07 — Decisiones firmadas

Registro de producto y arquitectura para KaiStore Lite.  
**Fecha de cierre:** 2026-09-21  
**Estado:** firmado para planificación e implementación (salvo nota en § Auth).

## Resumen ejecutivo

Lite es una **app de escritorio de altísimo nivel**: una ventana (POS · Admin · Impresoras), dominio retail alineado al suite (incl. compras/recepciones, SERVICE, PACK, crédito interno), UI con **`@kai/ui` completo**, Admin con **misma IA que `kai-admin`**, POS con **paridad `kai-pos`**, Core en edición Lite (SQLite), impresión **in-process** vía `invoke`, installers **DMG + MSI** (Apple Silicon + Windows x64), **sin SII**.

---

## A — Producto / MVP

| # | Tema | Decisión |
|---|------|----------|
| 1 | MVP | Cobrar + ticket + catálogo **y** compras/recepciones en la misma entrega |
| 2 | Tipos / ventas | **SERVICE**, **crédito interno** y **PACK** incluidos |
| 3 | Tesorería | **Solo caja POS** (sin cuentas bancarias, gastos operativos ni hubs bancarios en Lite) |
| 4 | Backup | **Sí** — exportar / restaurar base desde la app |
| 5 | Usuarios | **Con roles** (modelo alineado a membresías/roles del suite, single-company) |
| 10 | Persistencia auth | **Usuarios en SQLite** (vía Core Lite) |

**Nota auth:** “10 USERS EN SQLITE” se interpreta como *usuarios persistidos en SQLite* (decisión 10), **sin tope de 10 usuarios** salvo que producto lo fije después.

### Fuera de alcance (sigue vigente)

SII/CAF/boleta electrónica, HCM, contabilidad completa, eShop, delivery, Kai Food, lavandería/taller avanzado/joyería, multi-empresa, segunda caja en otro PC compartiendo el mismo SQLite.

---

## B — Arquitectura (recomendación adoptada)

| # | Tema | Decisión | Alternativas descartadas |
|---|------|----------|---------------------------|
| 6 | Dominio | **B — Edición Lite de `kai-core`** (`KAI_EDITION=lite` o equivalente): una empresa, módulos fuera de alcance no registrados | C (core nuevo desde cero); A (empaquetar PWAs Next) |
| 7 | Runtime | **Tauri + sidecar Node (Core Lite)** en el mismo instalador; una sola app para el usuario | Todo el dominio en Rust en v1; iframes Next |
| 8 | UI ↔ datos | **HTTP `127.0.0.1`** hacia Core Lite (REST). Impresión solo **`invoke` Tauri** | Solo invoke para todo el ERP; WS LAN obligatorio para print |
| 9 | SQLite | **TypeORM + SQLite**, subset de entidades, esquema/migraciones Lite; Redis → memoria/no-op | Compartir archivo SQLite entre PCs; Postgres embebido |

Consecuencia: la UI Vite **no** reutiliza Server Actions de `kai-admin`/`kai-pos`; reutiliza **semántica e IA** y habla con Core por HTTP local.

---

## C — UI / shell

| # | Tema | Decisión |
|---|------|----------|
| 11 | `@kai/ui` | **Completo desde el inicio** — adaptar componentes con deps Next (DataGrid, Tabs, layouts) para Vite; no MVP “solo Button” |
| 12 | Admin | **Misma estructura/navegación que `kai-admin` suite**, recortada a módulos Lite (ocultar HCM, SII, eShop, Food, tesorería bancaria, etc.) |
| 13 | POS | **Paridad de UX y flujos con `kai-pos`** (sesión de caja, cobro, ticket, SERVICE/PACK/crédito según alcance) |
| 14 | Shell | **Nivel profesional:** title bar custom con segmentos POS \| Admin \| Impresoras; overlay macOS; cerrar → bandeja; Salir desde tray; atajos ⌘/Ctrl+1..3; estado POS preservado al cambiar sección |

“Misma estructura / paridad” = **mismos menús, pantallas y flujos permitidos**, implementados en **Vite + React + `@kai/ui`**, no copiar el runtime Next.

---

## D — Impresión

| # | Tema | Decisión |
|---|------|----------|
| 15 | Motor | **Crate / módulo Rust compartido** (extraído o factorizado desde `kai-printers-desktop`), embebido; **una sola app** |
| 16 | API print | **Solo `invoke` interno** en v1 (sin exigir agente WS en LAN) |

---

## E — Entrega

| # | Tema | Decisión |
|---|------|----------|
| 17 | Targets | **Apple Silicon** + **Windows x64** (no Intel Mac en v1 salvo decisión posterior) |
| 18 | Installers | **DMG** (macOS) + **MSI** (Windows) |
| 19 | Seed | **Seed mínimo al primer arranque: sí** |

Versionado: SemVer propio en `kai-store-lite/package.json` + `tauri.conf.json`; bump independiente del suite; fila en `docs/apps/VERSIONS.md` al primer release. Bundle id sugerido: `com.kaistore.lite`.

---

## F — Licencias

Detalle: [09-licencias.md](./09-licencias.md).

| # | Tema | Decisión |
|---|------|----------|
| L1 | Comercial | **Perpetua**, atada a máquina, **sin vencimiento** |
| L2 | Sin emisión | Solo **trial 10 días**; al vencer, bloqueo hasta activar licencia |
| L3 | Cambio disco/PC | **Sin reactivaciones gratis** en software → nueva emisión |
| L4 | Usuarios | **Libre** (sin tope en licencia) |
| L5 | Emisión | **A — Script / CLI manual** (clave privada fuera del cliente) |

---

## Implicaciones para el plan

1. El MVP es **denso** (recepciones + PACK + SERVICE + crédito + roles + backup + seed + **licencia/trial**).
2. Hay trabajo **paralelo** en `@kai/ui` (Vite-ready) y Core Lite (SQLite).
3. Admin/POS Lite son **ports de IA**, no wrappers de las PWAs.
4. Spike (ver [06-riesgos-y-spike.md](./06-riesgos-y-spike.md) y [08-guia-desarrollo.md](./08-guia-desarrollo.md)) valida shell + Core SQLite + invoke print antes del port completo.
5. Gate de licencia/trial en **Rust** antes (o al) arranque operativo del sidecar.
