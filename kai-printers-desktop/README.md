# KaiPrinters (Tauri)

Agente local de impresión para las PWAs KaiStore: WebSocket en **`0.0.0.0`** por defecto (localhost y otros equipos en la LAN), SQLite para ajustes y mapeo de impresoras, **WSS** opcional con certificado autofirmado en el directorio de datos de la app.

Protocolo y comportamiento: [docs/print_service_app_developer_guide_v2.md](../docs/print_service_app_developer_guide_v2.md).

**Desarrollador:** Felipe Chandía Castillo

## Iconos de la app (macOS / Windows)

Assets en `public/`:

| Archivo | Uso |
|---------|-----|
| `kai-printers.png` | Dock, Control Center, `.icns` / `.ico` |
| `KaiPrinters-mac-bar.png` | Barra de menú superior (macOS) |
| `logo.png` | Footer de la UI (`/logo.png`) |

Tras cambiar los PNG:

```bash
npm run generate-icons
```

Regenera `src-tauri/icons/` (app) y `src-tauri/icons/tray-icon.png` (barra). Se ejecuta automáticamente antes de `npm run tauri:build`. Recompilá la app Tauri para ver los cambios en Dock y tray.

## Valores por defecto

| Ajuste | Valor |
|--------|--------|
| Host de escucha | **`0.0.0.0`** (toda la LAN; `127.0.0.1` = solo este equipo) |
| Puerto WS | **14567** |
| Puerto WSS | **14568** |
| Base de datos | `%app_data%/print_service.sqlite3` |
| Certificado TLS | `%app_data%/agent-tls-cert.der`, `agent-tls-key.der` |

Desactivá WSS con el ajuste SQLite `wss_enabled` = `false` (requiere reiniciar el agente).

**Cierre de la ventana principal:** la ventana se oculta; el servicio sigue en la bandeja del sistema. Para salir por completo, usá «Salir» en el menú de la bandeja (macOS) o el equivalente en tu SO.

Cambiar `listen_host` / `listen_port` / `wss_listen_port` vía la UI o `set_config` solo actualiza SQLite; **reiniciá el servicio** (botón energía en KaiPrinters) para que los sockets vuelvan a enlazar.

## POS / tablet en otro equipo (red local)

1. **KaiPrinters** corre en el Mac con la impresora (no en el tablet).
2. En KaiPrinters → Configuración: **Interfaz de red** = `0.0.0.0`, puerto WS **14567**. Reiniciar el servicio.
3. **Orígenes permitidos**: activar «Permitir todos» *o* agregar `http://<IP-del-tablet-o-PC>:3022` (la URL exacta del POS en el navegador).
4. En el **POS** (Configuración → impresión local): host = **IP LAN del Mac** (ej. `192.168.1.19`), **no** `127.0.0.1`.
5. macOS puede pedir permitir conexiones entrantes para KaiPrinters (Firewall).
6. Probar: `lsof -nP -iTCP:14567 -sTCP:LISTEN` debe mostrar `*:14567` o `0.0.0.0:14567`, no solo `127.0.0.1`.

## Puerto WS ocupado (`Address already in use` / os error 48)

En **macOS/Linux**, al iniciar se intenta liberar los puertos WS/WSS: se buscan procesos en `LISTEN` en esos puertos cuya línea de comando parezca este binario (`kai-printers`, `KaiPrinters`, etc.) y se les envía **SIGTERM** antes del `bind`.

Si el error persiste:

1. **Otra copia de KaiPrinters** que no coincida con el filtro. Cerrá la de la bandeja o el otro terminal.
2. Ver quién usa el puerto (macOS):
   ```bash
   lsof -nP -iTCP:14567 -sTCP:LISTEN
   ```
3. Si es un proceso que podés cerrar, salilo desde Monitor de actividad o `kill <PID>`.
