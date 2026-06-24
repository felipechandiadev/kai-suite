# Impresión — KaiStore / Flow Store 2

Documentación viva del sistema de impresión POS y agentes. Complementa [IF-09](../implementaciones-futuras/IF-09-formatos-impresion-58-80-carta-a4.md) (formatos) e [IF-01](../implementaciones-futuras/IF-01-kai-printers-android-nativo.md) (Android).

## Estado (junio 2026)

- **Venta real en tablet iMin + USB 80 mm:** funcionando con Kai Printers **v1.1.5+** (todos los tickets POS en **v1.1.6+**)
- **Demo / prueba de impresión:** ya funcionaba antes del fix
- **Reimpresión desde movimientos de caja:** mismo pipeline que venta
- **Renderers ESC/POS restantes (cotización, arqueo, NC, …):** especificados en [renderers/](./renderers/README.md) — **pendiente implementación Android**

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [ESTRATEGIA-IMPRESION.md](./ESTRATEGIA-IMPRESION.md) | Visión, tipos de documento, formatos, impresoras, canales |
| [ARQUITECTURA.md](./ARQUITECTURA.md) | Flujo POS → WebSocket → cola → transporte |
| [RENDERERS-ESC-POS.md](./RENDERERS-ESC-POS.md) | Plan renderers dedicados — Tauri vs Android, fases |
| [IMPLEMENTACION-BACKLOG.md](./IMPLEMENTACION-BACKLOG.md) | **Checklist ejecutable** — qué implementar y en qué orden |
| [renderers/](./renderers/README.md) | Especificación por tipo de ticket (`pos-*-ticket`) |
| [BUG-VENTA-REAL-JUNIO-2026.md](./BUG-VENTA-REAL-JUNIO-2026.md) | Postmortem venta real (resuelto) |
| [FORMATOS-Y-DOCUMENTOS.md](./FORMATOS-Y-DOCUMENTOS.md) | Matriz documento × formato |
| [KAI-PRINTERS-ANDROID.md](./KAI-PRINTERS-ANDROID.md) | App Android, versión, tests |
| [OPERACION.md](./OPERACION.md) | Instalación, QA en tienda |

## Paquetes y apps

| Componente | Ruta |
|------------|------|
| Cliente WebSocket compartido | `packages/print-service-client` |
| POS — orquestación impresión | `pwa-pos/src/features/pos-print/` |
| Agente Android | `kai-printers-android/` |
| Agente Tauri (desktop) | `print-service/` |
| Instalación operadores | [KAI_PRINTERS_INSTALACION_ANDROID.md](../KAI_PRINTERS_INSTALACION_ANDROID.md) |
