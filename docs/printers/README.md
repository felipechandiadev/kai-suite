# Impresión — KaiStore / Flow Store 2

Documentación viva del sistema de impresión POS y agentes. Complementa [IF-09](../implementaciones-futuras/IF-09-formatos-impresion-58-80-carta-a4.md) (formatos) e [IF-01](../implementaciones-futuras/IF-01-kai-printers-android-nativo.md) (Android).

| Documento | Contenido |
|-----------|-----------|
| [ESTRATEGIA-IMPRESION.md](./ESTRATEGIA-IMPRESION.md) | Visión, tipos de documento, formatos, impresoras, canales de salida |
| [ARQUITECTURA.md](./ARQUITECTURA.md) | Flujo POS → WebSocket → cola → transporte (USB/BT/red) |
| [BUG-VENTA-REAL-JUNIO-2026.md](./BUG-VENTA-REAL-JUNIO-2026.md) | Postmortem: venta real no imprimía (junio 2026) — **resuelto** |
| [FORMATOS-Y-DOCUMENTOS.md](./FORMATOS-Y-DOCUMENTOS.md) | Matriz documento × formato × agente |
| [KAI-PRINTERS-ANDROID.md](./KAI-PRINTERS-ANDROID.md) | App Android: cola, ESC/POS, USB, versión publicada |
| [OPERACION.md](./OPERACION.md) | Instalación, configuración POS, pruebas, síntomas frecuentes |

## Estado (junio 2026)

- **Venta real en tablet iMin + USB 80 mm:** funcionando con Kai Printers **v1.1.5+**
- **Demo / prueba de impresión:** ya funcionaba antes del fix
- **Reimpresión desde movimientos de caja:** mismo pipeline que venta
- **Pendiente / siguiente:** tickets vectoriales para cotización, arqueo, NC, etc. en Android (hoy comparten cola; algunos tipos aún sin renderer ESC/POS dedicado)

## Paquetes y apps

| Componente | Ruta |
|------------|------|
| Cliente WebSocket compartido | `packages/print-service-client` |
| POS — orquestación impresión | `pwa-pos/src/features/pos-print/` |
| Agente Android | `kai-printers-android/` |
| Agente Tauri (desktop) | `print-service/` |
| Instalación operadores | [KAI_PRINTERS_INSTALACION_ANDROID.md](../KAI_PRINTERS_INSTALACION_ANDROID.md) |
