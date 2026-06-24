# Operación — impresión en tienda

Guía rápida para soporte y QA. Instalación detallada: [KAI_PRINTERS_INSTALACION_ANDROID.md](../KAI_PRINTERS_INSTALACION_ANDROID.md).

## Checklist post-instalación

1. Kai Printers **v1.1.5+** instalado
2. Servicio en primer plano activo (notificación visible)
3. Impresora USB/BT configurada en pestaña correspondiente
4. **Imprimir prueba** OK desde Kai Printers
5. POS → Impresión local: host `127.0.0.1` (misma tablet), WSS si HTTPS
6. Icono impresión en TopBar **verde**
7. Venta real sin cliente → ticket sale

## Síntomas y causas

| Síntoma | Causa probable | Acción |
|---------|----------------|--------|
| Error `JsonNull is not a JsonObject` | Agente **&lt; 1.1.5** | Actualizar Kai Printers |
| `closed_before_open` / no conecta | Servicio detenido o host/puerto mal | Iniciar servicio; revisar IP/puertos |
| Encola pero no imprime, sin error | POS antiguo sin `waitForPrintJob` | Actualizar POS |
| Demo OK, venta falla (agente nuevo) | Poco probable tras 1.1.5 | Ver logcat `PrintQueueWorker` |
| Ticket cortado / ilegible | Formato 80 mm en impresora 58 mm | Alinear formato POS y perfil en mapeo |
| Cola bloqueada | Job USB colgado | Reiniciar servicio Kai Printers (recupera stale jobs) |

## Logs útiles

**POS (consola navegador):**

- `[KaiStore print] ticket → agente ESC/POS (job …)` — encolado OK
- `[KaiStore print] agente no disponible o encolado falló` — conexión o entrega fallida

**Android:** `adb logcat | grep -E "PrintQueue|PrintAgent|UsbEsc"`

## Pruebas de regresión mínimas

1. Prueba desde configuración POS
2. Venta demo (settings)
3. Venta real con 2+ productos y pago efectivo
4. Reimprimir ticket y documento desde movimientos de caja
5. Reiniciar app Kai Printers y repetir venta (cola persiste)
