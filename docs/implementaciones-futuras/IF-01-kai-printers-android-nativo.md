# IF-01 · Kai Printers — aplicación nativa Android

| Campo | Valor |
|-------|-------|
| **ID** | IF-01 |
| **Estado** | Diseño |
| **Prioridad** | P1 |
| **Última revisión** | junio 2026 |
| **Tareas** | [ROADMAP.md § IF-01](./ROADMAP.md#if-01--kai-printers--android-nativo) |

---

## 1. Resumen ejecutivo

**Kai Printers** es el agente local de impresión del ecosistema KaiStore. Hoy está especificado y parcialmente integrado como app de **escritorio Tauri** (macOS / Windows) que expone un servidor WebSocket; las PWAs (`pwa-admin`, `pwa-pos`) se conectan vía el paquete `print-service-client`.

Esta implementación futura define la **versión nativa Android** de Kai Printers: una app instalada en tablet o teléfono que cumple el **mismo rol funcional** cuando el POS corre en Chrome/Android y no existe un agente Tauri en la misma máquina.

| Aspecto | Escritorio (actual / planificado) | Android (IF-01) |
|---------|-----------------------------------|-----------------|
| Stack | Tauri + Rust | Kotlin (recomendado) + Android SDK |
| UI | Tray + ventana config | Notificación + Activity config |
| Clientes | pwa-admin, pwa-pos (HTTPS) | Igual |
| Protocolo | WebSocket v2.1 | **Compatible** — mismo contrato |
| Impresoras | Spooler OS | BT, USB OTG, red, ESC/POS |

---

## 2. Problema que resuelve

En retail LATAM es habitual usar **tablets Android** como terminal POS (PWA en Chrome). Esas tablets:

- No ejecutan el binario Tauri de Kai Printers.
- No pueden imprimir tickets térmicos de forma silenciosa desde el navegador.
- A menudo se conectan a impresoras **Bluetooth** o **Wi‑Fi** (ESC/POS), no al spooler de escritorio.

Sin agente nativo, el flujo actual depende de:

- Impresión del navegador (mala UX, no silenciosa), o
- Un PC/Mac intermedio con Kai Printers desktop (complejidad operativa).

**Objetivo:** imprimir tickets, documentos y (fase posterior) etiquetas desde `pwa-pos` / `pwa-admin` con la misma experiencia que en caja de escritorio.

---

## 3. Contexto en el monorepo

```
pwa-pos / pwa-admin
       │
       │  WebSocket (JSON v2.1)
       ▼
┌──────────────────┐     ┌─────────────────────┐
│ print-service    │     │ kai-printers-android │  ← IF-01
│ (Tauri desktop)  │     │ (Kotlin, Play/APK)   │
└────────┬─────────┘     └──────────┬──────────┘
         │                          │
         └──────────┬───────────────┘
                    ▼
              Impresoras físicas
```

| Componente existente | Ubicación | Uso para IF-01 |
|---------------------|-----------|----------------|
| Cliente WebSocket PWA | `packages/print-service-client` | **Reutilizar sin cambios** si protocolo idéntico |
| UI conexión / health | `usePrintServiceConnection` | Ya menciona KaiPrinters, WSS, IP LAN |
| Spec protocolo | `docs/legacy/print_service_app_developer_guide_v2.md` | Contrato de referencia |
| Ajustes admin | `pwa-admin` → `/settings/local-printing` | Misma config; host puede ser `127.0.0.1` o IP tablet |

No existe aún carpeta `print-service/` (Tauri) en el repo; IF-01 puede desarrollarse en paralelo compartiendo **esquema de mensajes** y pruebas de contrato.

---

## 4. Alcance funcional

### 4.1 En alcance (MVP — F1)

- App Android instalable (APK/AAB).
- **Foreground Service** con servidor WebSocket en `localhost` (puerto configurable, default alineado con v2 desktop).
- Handshake `hello` / respuesta con versión, capacidades, sesiones conectadas.
- Cola de impresión persistente (SQLite vía Room).
- Jobs **PDF Base64** → render → impresora térmica 80 mm (ESC/POS).
- Mapeo `purpose` → dispositivo: mínimo `tickets`; opcional `documents` en F1 si Android Print Framework es viable.
- Pantalla de configuración: puerto, token, impresora por propósito, prueba de impresión.
- Eventos push: `printer_health`, `print_job_done`, `print_job_failed`, `config_changed`.

### 4.2 Fuera de alcance MVP

- Publicación en Play Store **pública** (MVP: distribución privada / sideload).
- Paridad total con Tauri (tray macOS, autostart Windows).
- iOS / iPadOS (idea separada en roadmap backlog).
- Generación de PDF en el agente (sigue en la PWA).

### 4.3 Fases posteriores (F2–F3)

Ver [ROADMAP.md](./ROADMAP.md): bind LAN, admin remoto de config, etiquetas ZPL, hardening batería/OEM.

---

## 5. Stack técnico recomendado

| Capa | Elección | Motivo |
|------|----------|--------|
| Lenguaje | **Kotlin** | Foreground services, USB/BT APIs, mantenimiento largo plazo |
| UI config | Jetpack Compose | Pantallas simples, Material 3 |
| WebSocket | OkHttp / Ktor server embebido | Evaluar en IF-01.T4 |
| Persistencia | Room (SQLite) | Alineado con schema conceptual v2 |
| PDF → bitmap | Android PdfRenderer + escpos-coffee o similar | Ticket 80 mm |
| BT | Android Bluetooth API (SPP) | Impresoras térmicas más comunes |
| USB | UsbManager + permiso OTG | Cajones / impresoras cableadas |
| Build | Gradle (módulo `kai-printers-android/` en monorepo) | CI unificado |

### 5.1 Compatibilidad Android (paridad mobilePOS)

| Parámetro | Valor |
|-----------|-------|
| **minSdk** | 24 (Android 7.0 Nougat) |
| **targetSdk** | 33 (Android 13) |
| **compileSdk** | 35 |

Una sola APK cubre API 24–33. Desugaring habilitado para `java.time`. Permisos Bluetooth y foreground service ramificados por era; iconos y splash calificados por versión (legacy launcher, adaptive, monochrome API 33+).

**Alternativa descartada por ahora:** React Native — duplicaría lógica de bajo nivel (BT/USB) en bridges nativos sin ventaja clara.

**Alternativa descartada:** reutilizar Tauri mobile — soporte Android inmaduro para servidor WS + drivers impresora.

---

## 6. Arquitectura Android

```
┌─────────────────────────────────────────┐
│  Kai Printers Android                    │
│                                          │
│  ┌─────────────┐    ┌─────────────────┐ │
│  │ Config UI   │    │ Foreground Svc  │ │
│  │ (Activity)  │───▶│ WebSocket :port │ │
│  └─────────────┘    └────────┬────────┘ │
│                              │          │
│                    ┌─────────▼────────┐ │
│                    │ PrintQueueWorker │ │
│                    │ + Room DB        │ │
│                    └─────────┬────────┘ │
│                              │          │
│              ┌───────────────┼───────────┤
│              ▼               ▼           │
│         Bluetooth        USB / WiFi      │
│         ESC/POS          raw socket      │
└─────────────────────────────────────────┘
         ▲
         │ ws/wss (Chrome PWA same device)
         │
   pwa-pos (tablet)
```

### 6.1 Modos de despliegue

| Modo | Descripción | Host en PWA |
|------|-------------|-------------|
| **A — Mismo dispositivo** | PWA y Kai Printers en la misma tablet | `127.0.0.1` |
| **B — Agente dedicado** | Tablet POS + mini-PC o segunda tablet solo impresión | IP LAN del agente |
| **C — Impresora de red** | Agente en tablet envía a IP:9100 | Config en agente |

MVP prioriza **modo A**; modo B requiere bind LAN (F2).

### 6.2 Seguridad (paridad v2)

1. Validación de `Origin` en upgrade WebSocket (orígenes HTTPS del POS/admin + dev localhost).
2. Token en primer mensaje `hello`, no solo query string.
3. **WSS** con certificado autofirmado generado en primer arranque (Chrome Android exige TLS desde página HTTPS).
4. En producción LAN: lista blanca de IPs/orígenes configurable.

Referencia: guía v2 §4.

---

## 7. Protocolo WebSocket (contrato)

Mantener **versión `2.1`** y acciones ya consumidas por `print-service-client`:

| Acción (cliente → agente) | Uso |
|---------------------------|-----|
| `hello` | Sesión, metadatos empresa/POS |
| `print_job` / `print` | PDF Base64 + `purpose` + `jobId` / ticket JSON |
| `get_config` / `set_config` | Puerto, token, orígenes |
| `set_printer_mapping` | Líneas por `purpose` |
| `get_printer_health` | Estado impresoras |

| Evento (agente → cliente) | Uso |
|----------------------------|-----|
| `printer_health` | Topbar POS, alertas offline |
| `print_job_done` / `print_job_failed` | Cola UI |
| `config_changed` | Refrescar settings |

**Prueba de contrato:** suite compartida (JSON fixtures) entre Tauri y Android antes de release.

---

## 8. UX producto

| Elemento | Comportamiento |
|----------|----------------|
| Instalación | APK firmado; deep link opcional `kaiprinters://pair?token=…` |
| Arranque | Opción “Iniciar con el dispositivo”; guía para desactivar optimización batería |
| Notificación | “Kai Printers activo — Puerto 14567” + acceso rápido a config |
| Errores | Mensajes alineados con `print-service-client` (`KaiPrinters sin conexión`, etc.) |
| Branding | Nombre visible **Kai Printers** (consistente con mensajes PWA) |

---

## 9. Criterios de aceptación (MVP)

1. Con `pwa-pos` en Chrome Android en la misma tablet, imprimir un ticket de venta sin diálogo del sistema.
2. Reconexión automática tras matar y reabrir Chrome (agente sigue en foreground).
3. `printer_health` refleja impresora BT desconectada en &lt; 10 s.
4. Configuración de impresora `tickets` persiste tras reinicio del dispositivo.
5. Documentación de instalación para operador no técnico (1 página PDF).

---

## 10. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Mixed Content HTTPS → WSS | Alto | Cert local + flujo “confiar una vez”; IF-01.T4 |
| Fabricantes matan el servicio en background | Alto | Foreground + whitelist UX; IF-01.T32 |
| Fragmentación ESC/POS | Medio | Perfiles por marca en config; prueba piloto |
| Duplicar lógica con Tauri | Medio | Contrato JSON compartido; evitar divergencia de versiones |
| USB OTG no disponible en tablet | Bajo | Priorizar BT en MVP |

---

## 11. Decisiones abiertas

| # | Pregunta | Opciones | Due |
|---|----------|----------|-----|
| D1 | ¿Monorepo `kai-printers-android/` o repo separado? | **Monorepo** (cerrado) | Equipo |
| D2 | Puerto default Android = mismo que desktop | **Sí — 14567/14568** (cerrado) | IF-01.T4 |
| D3 | ¿Publicar en Play Store privado (Managed Google Play)? | F2 | Producto |
| D4 | Librería ESC/POS | escpos-coffee vs custom | F1 |

---

## 12. Referencias

- [ARQUITECTURA §10 — Impresión local](../project/ARQUITECTURA_Y_ECOSISTEMA.md)
- [print_service_app_developer_guide_v2.md](../legacy/print_service_app_developer_guide_v2.md)
- `packages/print-service-client/src/core.ts` — URL, protocolo, health
- `pwa-admin/app/(app)/settings/local-printing` — configuración operador

[← Índice](./README.md) · [Roadmap IF-01](./ROADMAP.md#if-01--kai-printers--android-nativo)
