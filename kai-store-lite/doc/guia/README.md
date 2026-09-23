# Guía de desarrollo completa — KaiStore Lite

Especificación de implementación **de punta a punta**: árbol de archivos, rutas, APIs, funciones previstas por archivo y fases de construcción.

Esta carpeta **no es código**. Es el contrato para construir la app. El resumen corto de fases sigue en [`../08-guia-desarrollo.md`](../08-guia-desarrollo.md).

## Cómo leer

| Orden | Documento | Contenido |
|------:|-----------|-----------|
| 1 | [00-convenciones.md](./00-convenciones.md) | Nombres, capas, prefijos, Done |
| 2 | [00-arbol-proyecto.md](./00-arbol-proyecto.md) | **Todos** los paths previstos + objetivo |
| 3 | [01-rutas-admin.md](./01-rutas-admin.md) | Rutas Admin Lite (IN/OUT vs suite) |
| 4 | [02-rutas-pos.md](./02-rutas-pos.md) | Rutas POS Lite |
| 5 | [03-rutas-shell-license-printers.md](./03-rutas-shell-license-printers.md) | Shell, licencia, impresoras |
| 6 | [04-api-core-lite.md](./04-api-core-lite.md) | Endpoints HTTP Core Lite usados |
| 7 | [modulos/](./modulos/README.md) | **Por archivo:** exports / funciones / invokes |
| 8 | [fases/](./fases/README.md) | Fases 01–10 con checklist de archivos |

## Alcance

Solo lo firmado en [`../07-decisiones-firmadas.md`](../07-decisiones-firmadas.md), [`../02-alcance-v1.md`](../02-alcance-v1.md) y [`../09-licencias.md`](../09-licencias.md).

## Principio de paridad

- **Admin:** misma IA que `kai-admin`, menús/rutas **recortados** a Lite.
- **POS:** paridad de flujos con `kai-pos` (sin laundry/Food).
- **Implementación:** Vite + React + `@kai/ui` + HTTP Core + `invoke` print/license — **no** Next.js.

## Estado

Especificación v1.0 (2026-09-21). Al implementar, marcar checkboxes en `fases/` y no inventar paths fuera de `00-arbol-proyecto.md` sin actualizar esta guía.
