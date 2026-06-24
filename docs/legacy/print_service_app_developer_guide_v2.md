# Print Service App — Guía de desarrollo (v2)

Documento de referencia para el **servicio local de impresión** (app de escritorio) que complementa **pwa-admin** y **pwa-pos**. Sustituye y amplía la guía v1: arquitectura, seguridad, protocolo, cola, multiplataforma y configuración desde las PWAs y desde la app local.

---

## 1. Resumen ejecutivo

| Aspecto | Decisión |
|--------|-----------|
| **Producto** | Aplicación de escritorio **Tauri** (Rust + shell web liviano), orientada a **bandeja del sistema** (tray) y ejecución en **segundo plano**. |
| **Plataformas** | **macOS** y **Windows** (builds separados; mismo protocolo y comportamiento funcional). |
| **Clientes** | **pwa-admin** y **pwa-pos**: canal **WebSocket** bidireccional al host local (comandos + **alertas** de servicio/impresoras hacia la PWA). |
| **Configuración de impresoras** | Debe poder hacerse **desde pwa-admin**, **desde pwa-pos** y **desde la app del servicio** (UI local / preferencias del tray). Los tres orígenes deben converger en la **misma fuente de verdad** persistida en el servicio (SQLite). |
| **Propósitos** | Mapeo lógico → impresora física: `documents`, `tickets`, `labels` (extensible). |
| **Formatos** | Cuatro formatos explícitos en jobs PWA: `ticket_58mm`, `ticket_80mm`, `document_letter`, `document_a4` (véase **§3.4** e [IF-09](../implementaciones-futuras/IF-09-formatos-impresion-58-80-carta-a4.md)). |
| **Comunicación** | WebSocket en `localhost`, puerto **configurable** (default documentado). |
| **Contenido** | Preferencia MVP/producción: **PDF en Base64** generado en la PWA (React), enviado al servicio para impresión silenciosa. |

**Problema que resuelve:** las PWAs no pueden imprimir de forma fiable y silenciosa a impresoras térmicas / A4 / etiquetas sin pasos del usuario; el servicio local tiene acceso al sistema de impresión y a drivers.

---

## 2. Arquitectura

```
┌─────────────────┐     ┌─────────────────┐
│   pwa-admin     │     │    pwa-pos      │
│  (HTTPS PWA)    │     │  (HTTPS PWA)    │
└────────┬────────┘     └────────┬────────┘
         │  ws/wss + JSON  (peticiones + eventos push)  │
         └──────────┬─────────────┘
                    ▼
         ┌──────────────────────┐
         │  Print Service App  │
         │  Tauri + Rust core    │
         │  • WebSocket server     │
         │  • Cola de impresión    │
         │  • SQLite config/jobs   │
         │  • Tray / segundo plano │
         │  • Render PDF → spooler │
         └──────────┬─────────────┘
                    ▼
              Impresoras OS
```

- **Desacoplamiento:** la PWA solo es cliente; no requiere autenticación duplicada de “usuario del servicio” (el usuario ya autenticó en FlowStore).
- **Reutilización:** un solo binario por SO atiende admin y POS en la misma máquina (puerto único; opcional `clientId` por conexión).

---

## 3. Alcance funcional

### 3.1 App Tauri (Mac y Windows)

- Arranque con el sistema (opcional, configurable).
- Icono en **bandeja**: abrir ventana de configuración, estado, “Pausar impresión”, salir.
- **Segundo plano:** el servidor WebSocket y la cola siguen activos aunque la ventana esté cerrada (comportamiento típico de “agente de impresión”).

### 3.2 Configuración de impresoras (tres orígenes)

1. **pwa-admin:** pantalla de ajustes “Servicio de impresión” (URL del servicio, puerto, prueba de conexión, asignación `purpose` → impresora, colas).
2. **pwa-pos:** misma capacidad a nivel UX que admin (cajeros/puntos sin depender solo de IT).
3. **App local:** cuando la PWA no puede alcanzar el servicio o para diagnóstico avanzado: listar impresoras del OS, asignar propósitos, puerto, orígenes permitidos, exportar logs.

**Regla de sincronización:** toda mutación de configuración debe **escribirse en SQLite en el servicio**. Las PWAs envían comandos (`set_config`, `set_printer_mapping`, etc.); la app local puede mutar la misma DB sin pasar por WebSocket. Tras cualquier cambio, el servicio debe **emitir por WebSocket** `config_changed` y un snapshot de **`printer_health`** (véase **§5.6** y **§7.4**) para actualizar la **topbar** y formularios abiertos.

### 3.3 Propósitos (`purpose`)

| `purpose`   | Uso típico        | Ejemplo |
|------------|-------------------|---------|
| `documents`| A4 / carta, facturas, OCs | Impresora láser / PDF (`document_a4`, `document_letter`) |
| `tickets`  | Térmica 58 / 80 mm        | Cajón / ticket (`ticket_58mm`, `ticket_80mm`) |
| `labels`   | Etiquetas         | Zebra / similar |

Cada `purpose` puede tener **varias líneas** de impresora del OS en orden de failover (SQLite `printer_mapping_lines`); el worker intenta en `sort_order` hasta éxito o agotar líneas.

### 3.4 Formatos de impresión (`format`)

Además de `purpose`, cada job debe llevar un **`format`** que fija el tamaño físico del PDF o ticket. Definición canónica en `packages/print-service-client/src/print-format.ts`.

| `format` | Rol | `purpose` derivado | Perfil agente (`PrinterPaperProfile`) |
|----------|-----|--------------------|---------------------------------------|
| `ticket_58mm` | Ticket térmico estrecho | `tickets` | `58mm` |
| `ticket_80mm` | Ticket térmico estándar | `tickets` | `80mm` |
| `document_letter` | Documento carta (216×279 mm) | `documents` | `letter` |
| `document_a4` | Documento A4 (210×297 mm) | `documents` | `a4` |

**Presets** (ancho contenido, chars/línea, `@page` CSS): `print-format-presets.ts` en el mismo paquete.

**Compatibilidad:** clientes que envíen solo `purpose` sin `format` deben ser interpretados como `ticket_80mm` (tickets) o `document_a4` (documents). Si `format` y `purpose` no coinciden, el agente responde error `format_purpose_mismatch`.

**Estado implementación (junio 2026):** PWAs generan PDF/HTML por formato y envían `format` en el JSON; agentes Tauri y Android interpretan `format`, validan perfil de papel y ajustan CUPS/ESC/POS (32 vs 48 cols, rollo 48 vs 72 mm). Ver [IF-09](../implementaciones-futuras/IF-09-formatos-impresion-58-80-carta-a4.md).

---

## 4. Seguridad (v2 — endurecida)

### 4.1 Problema de la v1

Autenticación solo con `?token=` en la URL del WebSocket es **débil** en entorno local: fuga por historial, logs, otros scripts en la máquina, y no valida origen.

### 4.2 Modelo recomendado para servicio local

No se busca replicar login de FlowStore en el binario. Sí se exige:

1. **Solo `localhost` / `127.0.0.1`** en el bind del servidor WebSocket (no `0.0.0.0` en producción).
2. **Validación de `Origin`** (o `Sec-WebSocket-Origin` según cliente) contra una **lista blanca** configurable:
   - Orígenes de producción de pwa-admin y pwa-pos (HTTPS).
   - Opción desarrollo: `http://localhost:3000`, etc.
3. **Token compartido** (opcional pero recomendado): enviado en el **primer mensaje** JSON (`hello`) o cabecera custom tras upgrade, **no** solo en querystring persistente.
4. **Puerto configurable** para evitar conflictos y hardcoding.

### 4.3 `ws://` vs `wss://`

- Desde **HTTPS**, algunos navegadores restringen **Mixed Content** (`ws://` desde página segura).
- **Estrategia:**
  - Documentar **WSS local** con certificado autofirmado generado por la app en primer arranque (o importado), **o**
  - Fallback: documentar política del navegador y uso de extensión/flags solo en desarrollo (no producción).

La guía de implementación debe fijar **un camino por defecto** (p. ej. WSS en localhost con cert trustado por el usuario una vez).

---

## 5. Comunicación: protocolo WebSocket

### 5.1 Versionado

Todo mensaje debe incluir:

```json
{
  "version": "2.1",
  "action": "...",
  ...
}
```

El servicio responde con la misma `version` soportada o error `unsupported_version`. Los agentes **2.1** aceptan clientes que declaren `2.1`; los campos JSON desconocidos en mensajes entrantes se ignoran cuando el parser sea tolerante (extensión sin romper clientes viejos).

### 5.1.1 Comandos Tauri (solo app local)

| Comando | Descripción |
|---------|-------------|
| `stop_print_network` | Cierra listeners WS/WSS en el proceso (sin salir del agente). |
| `start_print_network` | Libera puertos huérfanos si aplica, vuelve a enlazar WS y WSS según settings. |

### 5.2 Acciones mínimas (API explícita)

| `action` | Descripción |
|----------|-------------|
| `hello` | Handshake: token opcional, `clientId`, **`requiredPurposes`** opcional, y desde **v2.1** opcionales `appLabel` y `userDisplayName` (lista de sesiones en el agente). |
| `ping` | Salud: respuesta `{ "status": "alive", "version": "..." }`. |
| `health` | Estado extendido: cola, impresoras, último error. |
| `get_printers` | Lista impresoras del SO (nombres, default, estado). |
| `get_config` | Lee `mappingLines` (orden = failover por `purpose`) más mapeos legacy y settings. |
| `set_config` / `set_printer_mapping` | Actualiza SQLite (validar permisos vía token + origin). |
| `set_mapping_lines` | Reemplaza la tabla de líneas: array `{ id, purpose, systemPrinterName, sortOrder, displayLabel? }`. |
| `print` | Encola trabajo (PDF Base64, copias, `purpose`, nombre archivo; metadatos opcionales `documentType`, `internalFolio`, `sourceApp`, `requestedBy`). |
| `get_jobs` | Lista trabajos recientes (desde SQLite). |
| `cancel_job` | Cancela pendiente si aplica. |
| `test_print` | Encola el PDF mínimo de diagnóstico del agente (sin payload desde el cliente). |

**Política multi-línea:** varias filas con el mismo `purpose` se tratan como **failover** en orden de `sortOrder`. Los trabajos con éxito se **eliminan** de SQLite; los `error` se conservan. Detalle en `print-service/docs/print-agent-decisions.md`.

### 5.6 Eventos servidor → PWA (push por WebSocket)

Además de las respuestas a cada `action`, el **servicio debe poder enviar mensajes unilaterales** a todas las conexiones activas (o por `clientId`) cuando cambie el entorno de impresión. Así las apps **no dependen solo de polling** para reflejar estado en la **topbar** y en pantallas de ajustes.

| Campo / tipo | Descripción |
|----------------|-------------|
| `event` | Nombre del evento (no es un `action` de petición). |
| `payload` | Objeto con detalle (impresoras por `purpose`, razones, etc.). |

**Eventos mínimos recomendados:**

| `event` | Cuándo se emite | Uso en la PWA |
|---------|-----------------|---------------|
| `service_status` | Tras `hello`, periódicamente (heartbeat interno) o al cambiar disponibilidad del agente | Conectado / desconectado al WebSocket. |
| `printer_health` | Tras descubrimiento de impresoras, al fallar un job, al detectar impresora ausente o spooler con error | Actualizar **icono de topbar** y banners contextuales. |
| `purpose_mapping_invalid` | El `purpose` configurado apunta a una impresora que ya no existe en el SO | Alerta: “Reasignar impresora para tickets”. |
| `config_changed` | Cualquier mutación desde la app local u otra pestaña/cliente | Refrescar `get_config` en silencio o mostrar toast “Configuración actualizada”. |

**Ejemplo (`printer_health`):**

```json
{
  "version": "2.1",
  "event": "printer_health",
  "payload": {
    "overall": "degraded",
    "purposes": {
      "tickets": { "status": "error", "printerName": "EPSON TM-T20", "reason": "DEVICE_NOT_FOUND" },
      "documents": { "status": "ok", "printerName": "HP LaserJet" }
    },
    "message": "No hay impresora disponible para tickets."
  }
}
```

**Reglas:**

- Tras **cada** reconexión WebSocket, el cliente debe enviar `hello` y el servidor debe responder con un snapshot (`service_status` + `printer_health` o datos equivalentes en la respuesta de `hello`).
- Si no hay impresora mapeada para un `purpose`, el payload debe indicarlo explícitamente (`status: "unmapped"`) para distinguir de **offline** (`DEVICE_NOT_FOUND`, `OFFLINE`, etc.).

### 5.3 Impresión recomendada desde la PWA (documentos dinámicos)

1. La PWA genera el PDF en el cliente (**pdf-lib**, **jsPDF**, o **HTML → PDF** según estándar del proyecto).
2. Codifica el PDF en **Base64**.
3. Envía:

```json
{
  "version": "2.1",
  "action": "print",
  "format": "document_a4",
  "purpose": "documents",
  "type": "pdf-base64",
  "filename": "orden_123.pdf",
  "copies": 1,
  "clientId": "pwa-admin",
  "payload": "JVBERi0xLjQKJ..."
}
```

El campo **`format`** es obligatorio en clientes nuevos; el agente deriva `purpose` si solo llega `format`. Tickets térmicos usan `format: "ticket_80mm"` o `"ticket_58mm"` con el mismo `type: "pdf-base64"` (PDF de rollo generado en la PWA).

**Ventajas:** sin depender de red interna para el binario del PDF, sin descarga intermedia obligatoria para el usuario, el servicio solo renderiza/envía al spooler.

### 5.4 Cola de impresión y persistencia

Memoria (`tokio::mpsc`) **no basta** para robustez. Persistir en SQLite:

```sql
CREATE TABLE print_jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,       -- pending | printing | done | error | cancelled
  purpose TEXT,
  filename TEXT,
  payload_ref TEXT,           -- path a archivo temporal o hash; evitar BLOB gigante en DB si se prefiere
  copies INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  started_at TEXT,
  printed_at TEXT,
  error TEXT,
  priority INTEGER DEFAULT 0,
  client_id TEXT,
  document_type TEXT,
  internal_folio TEXT,
  source_app TEXT,
  requested_by TEXT
);
```

Comportamiento deseado: **retry** con backoff para errores transitorios, **timeout** por job, **cancelación**, **prioridad** (p. ej. tickets > reportes).

### 5.5 Concurrencia

- Identificar conexiones con **`clientId`** (admin vs pos vs otra pestaña).
- Un **worker** serial o N workers con bloqueo por impresora física para evitar mezclar trabajos en el mismo spooler.

---

## 6. Motor PDF y envío al spooler

**Implementación actual en KaiPrinters (`print-service`):**

| Plataforma | Documentos (PDF) | Tickets (ESC/POS) |
|------------|------------------|-------------------|
| **Windows** | **SumatraPDF** empaquetado: `-silent -print-to "<cola>"` (sin diálogo). Ver `platform.rs` y `print-service/THIRD_PARTY_NOTICES.md` (GPLv3). Override: `KAI_PRINTERS_SUMATRA`. |
| **macOS** | **`lp`** (CUPS), con opciones de rollo térmico cuando aplica (`Custom.48x…mm` / `Custom.72x…mm` según `format`). |
| **Tickets (ambos)** | RAW WinSpool / `copy /B` o TCP `:9100` en red; ancho ESC/POS según `format` (32 vs 48 cols). |

Build Windows: `npm run fetch-sumatra` antes de `tauri build`; CI en `print-service-release.yml` descarga Sumatra 3.5.2.

**Posible evolución (no implementada):** motor PDF embebido (PDFium) para unificar plataformas; hoy Windows usa Sumatra por simplicidad y impresión silenciosa fiable.

---

## 7. Impresoras, estado operativo y señalización en la PWA (topbar)

El servicio es la **fuente de verdad** del hardware: cuando falta una impresora, el mapeo es inválido o el spooler falla, debe **notificar por WebSocket** a las PWAs conectadas (véase **§5.6 Eventos servidor → PWA**). Las apps **mantienen una conexión WebSocket** (o reconexión con backoff) y derivan de los eventos el estado global de impresión.

### 7.1 Estados que debe modelar el servicio

| Estado (por `purpose` o global) | Significado |
|---------------------------------|-------------|
| `ok` | Impresora resuelta y operativa según el SO / cola. |
| `unmapped` | No hay impresora asignada a ese `purpose` en la config. |
| `offline` | Impresora configurada pero **no presente** en el sistema o no responde. |
| `error` | Error de driver, cola, permisos, PDF inválido, etc. (detalle en `reason`). |
| `degraded` | Al menos un `purpose` crítico (p. ej. `tickets`) no está `ok`. |

- **Health checks** periódicos en el servicio: re-enumerar impresoras del SO, comprobar cola/spooler y **emitir `printer_health`** cuando cambie cualquier estado respecto al último snapshot enviado.
- **Windows:** riesgo de **spooler bloqueado**; reflejar en `printer_health` con `reason: "SPOOLER_STUCK"` (o similar) y documentar acción manual / UI de diagnóstico en la app Tauri (sin ejecutar reinicios peligrosos sin confirmación).

### 7.2 Icono en la topbar (pwa-admin y pwa-pos)

Ambas PWAs deben exponer un **indicador fijo en la barra superior** (junto al resto de iconos de contexto) que resuma **conexión al agente de impresión** y **salud de las impresoras críticas** sin abrir ajustes.

**Comportamiento sugerido:**

| Vista del icono | Condición |
|-----------------|-----------|
| **Gris / apagado** | WebSocket desconectado o `service_status` ≠ listo (servicio no corre, puerto incorrecto, mixed content, etc.). |
| **Verde** | Servicio conectado y todos los `purpose` requeridos por esa app en `ok`. |
| **Ámbar (advertencia)** | Servicio conectado pero `degraded`: p. ej. tickets mal pero documentos bien. |
| **Rojo** | Sin impresora para un propósito obligatorio, todas las impresoras críticas en error, o mensaje explícito tipo “No hay impresora para tickets”. |

- **Tooltip / menú contextual** al pasar el mouse o clic: texto legible del último `payload.message` o lista corta por `purpose` (“Tickets: sin impresora”, “Documentos: OK”).
- **Clic** en el icono: atajo a la pantalla de **Impresión local** / ajustes del servicio o modal mínimo con “Reintentar conexión” y “Abrir configuración”.

**Implementación en cliente:** un hook o store global (`PrintServiceConnection`) que:

1. Abre el WebSocket hacia `localhost` (config de host/puerto).
2. Tras conectar, envía `hello` y procesa la respuesta + cualquier `event`.
3. Actualiza el estado del icono según el último `printer_health` / `service_status`.
4. Reintenta conexión con backoff y vuelve a pedir snapshot al reconectar.

### 7.3 Alertas explícitas (“el servicio avisa a la app”)

Cuando el servicio detecte que **no hay impresora** (o no hay mapeo) para un `purpose` que la PWA declara como **requerido** en `hello` (p. ej. POS envía `requiredPurposes: ["tickets"]`), debe enviar de inmediato:

- `purpose_mapping_invalid` o un `printer_health` con `overall: "degraded"` y el detalle por propósito,

para que la topbar pase a **ámbar/rojo** y, si se desea, se muestre un **toast o banner** no intrusivo (“Conectado al servicio de impresión, pero no hay impresora de tickets configurada”).

Opcional: evento `print_job_failed` con `jobId` y `purpose` para feedback tras una impresión puntual fallida.

### 7.4 Sincronía con la §3.2 (config en tres orígenes)

Cualquier cambio de mapeo desde la **app Tauri** u otra pestaña debe disparar `config_changed` (y un `printer_health` actualizado) para que **admin** y **pos** refresquen el icono de la topbar sin recargar la página.

---

## 8. Logging y diagnóstico

- Crate **`tracing`** (o equivalente) con niveles `INFO` / `WARN` / `ERROR`.
- **Rotación** de archivos y ruta configurable (default bajo carpeta de datos de la app).
- **Modo diagnóstico** en la app local:
  - Prueba de impresión por `purpose`
  - Ver puerto, orígenes permitidos, versión de protocolo
  - Exportar últimos N MB de logs
  - Últimos `print_jobs` fallidos

Las PWAs pueden invocar `ping` / `health` al inicio y tras errores de socket; el estado en vivo de la **topbar** debe basarse principalmente en los **eventos push** (`service_status`, `printer_health`) descritos en **§5.6** y **§7**.

---

## 9. UX en pwa-admin y pwa-pos

- **Topbar:** indicador de conexión y salud de impresión según **§7.2** (obligatorio en ambas apps para coherencia de soporte).
- Flujo común: detectar servicio (`ping`) → si OK, cargar `get_config` / `get_printers` → permitir editar mapeos → `set_printer_mapping`.
- Mensajes claros si **Mixed Content** bloquea `ws://` (orientar a WSS o a política documentada).
- Guardar en la PWA solo **preferencias del cliente** (URL/puerto del agente en esa caja), no duplicar toda la config si el diseño es “siempre autoritativo en el servicio”.

---

## 10. Roadmap sugerido (fases)

| Fase | Contenido |
|------|-----------|
| **M0** | Tray + WS `localhost` + `ping` + `get_printers` + log a archivo. |
| **M1** | `print` PDF Base64 + cola SQLite + mapeo `purpose` + `set_printer_mapping`. |
| **M2** | Origen + token en `hello`, WSS local documentado, retries/timeouts. |
| **M3** | Config desde admin y POS alineada; eventos `config_changed`; **push `printer_health` + icono topbar**; diagnóstico. |
| **M4** | Prioridades, cancelación, métricas, instalador silencioso empresa. |

---

## 11. Evaluación (referencia del análisis técnico)

| Área | Nota orientativa v1 | Objetivo v2 |
|------|---------------------|-------------|
| Arquitectura | 9/10 | Mantener |
| Escalabilidad | 9/10 | Cola persistida + API explícita |
| Seguridad | 6/10 | **Origin + localhost + handshake** |
| Robustez | 7/10 | Jobs, retry, timeouts, estados impresora |
| Mantenibilidad | 8.5/10 | Protocolo versionado + tracing |

---

## 12. Referencias internas (FlowStore)

- Integración en **pwa-admin** y **pwa-pos**: módulos de ajustes “Impresión local”, **WebSocket persistente**, **icono en `TopBar`** y detección del agente (contratos JSON alineados a **§5** y **§7**).
- Repositorio del binario: carpeta **`print-service`** del monorepo (crate `print-service` / producto FlowStore Print Service).

---

*Guía v2 — consolidada con requisitos multi-cliente (admin + POS), configuración híbrida, análisis de seguridad/protocolo/cola y decisiones de implementación sugeridas.*
