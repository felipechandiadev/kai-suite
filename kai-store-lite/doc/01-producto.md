# 01 — Producto

## Frase

**KaiStore Lite** es el Kai de un almacén o tienda pequeña: una empresa, una app de escritorio de altísimo nivel (Mac Apple Silicon / Windows x64), Admin + POS + Impresoras en la misma ventana, datos en SQLite, sin RRHH, sin Food, sin eShop y **sin SII**.

## Público

- Minimarket / almacén / ferretería / tienda de barrio.
- 1 sucursal; cajas en el **mismo PC** (v1).
- Usuarios con **roles** (dueño/admin + cajeros).
- Catálogo de cientos de SKUs (PHYSICAL, SERVICE, PACK).
- Stock en 1–3 almacenes (bodega + piso), con **compras/recepciones**.

## Promesa

Instalás (DMG/MSI), arranca con **seed mínimo**, cobrás, imprimís, recibís mercadería, cerrás caja y hacés **backup** desde la app. Los datos son del dueño y funcionan **sin internet** ni PostgreSQL/Redis que mantener.

## Relación con Kai Suite / Kai Store cloud

| | Suite / Store cloud | Lite |
|--|---------------------|------|
| Runtime | Postgres + Redis + Nest + PWAs Next | Tauri + Vite + Core Lite (sidecar) + SQLite |
| Empresas | Multi-tenant | Una empresa fija |
| Apps | Admin, POS, Printers, … separados | Tres secciones en **una** ventana |
| UI | Next + `@kai/ui` | Vite + `@kai/ui` (misma IA Admin / paridad POS) |
| Fiscal SII | Opcional / perfiles | **No** |
| Versión | Apps web + root monorepo | SemVer propio del binario Lite |

Mismo **dominio retail** (productos, ventas, stock, caja, recepciones). Distinto runtime, recorte y ciclo de release.

Export/import hacia Kai Store cloud: fase posterior; no requisito de v1.

## Nombre e identidad

- Producto: **KaiStore Lite**
- Carpeta monorepo: `kai-store-lite/`
- Identificador de bundle: `com.kaistore.lite`

## Decisiones

Detalle cerrado: [07-decisiones-firmadas.md](./07-decisiones-firmadas.md).
