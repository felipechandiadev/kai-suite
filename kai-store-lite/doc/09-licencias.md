# 09 — Licencias

Sistema de activación de **KaiStore Lite**. Decisiones firmadas 2026-09-21.

## Política de producto

| Tema | Decisión |
|------|----------|
| Licencia comercial | **Perpetua**, atada a la máquina, **sin fecha de vencimiento** |
| Sin licencia emitida | Solo **trial de 10 días** desde el primer arranque; al vencer, uso bloqueado hasta activar |
| Cambio de disco / PC | **Sin reactivaciones gratis** en el software: el fingerprint deja de coincidir → hay que emitir (y comercializar) una licencia nueva |
| Usuarios | **Libre** (la licencia no limita cantidad de usuarios) |
| Emisión | **A — Manual / script** en v1 (clave privada fuera del cliente) |

**Regla corta:** sin archivo/código de licencia válido → trial 10 días → luego solo pantalla de activación (+ backup de datos). Con licencia válida para este `machineId` → uso perpetuo en esa máquina.

---

## Flujo

```text
Instalación / primer arranque
        │
        ▼
 ¿Hay licencia firmada válida
    para este machineId?
        │
   no   │   sí
        ▼
  Trial 10 días ──────────────► Uso normal (perpetuo)
  (reloj desde primer uso)
        │
        │ venció
        ▼
  Bloqueo operativo
  (activar licencia /
   exportar backup)
        │
        │ pegar license.kai
        ▼
  Verify firma + machineId
        │
        ▼
  Uso perpetuo
```

---

## Machine ID (fingerprint)

No usar solo el serial del disco (frágil). En **Rust (Tauri)**:

1. Recolectar señales estables (p. ej. MachineGuid / IOPlatformUUID + identificadores de volumen/sistema).
2. Normalizar y hashear: `SHA-256(salt_app + signals)`.
3. Mostrar al usuario un **código de instalación** corto (p. ej. `KSL-XXXX-XXXX-XXXX`), no el HWID crudo.

La licencia firmada incluye ese `machineId` (o su hash canónico).

---

## Licencia firmada

Payload orientativo:

```json
{
  "v": 1,
  "product": "kaistore-lite",
  "machineId": "<hash canónico>",
  "issuedAt": "2026-09-21",
  "expiresAt": null,
  "licensee": "Nombre del comercio"
}
```

- Firma **Ed25519** (o RSA): privada solo en herramienta de emisión; **pública embebida en la app**.
- Archivo entregable: `license.kai` (o string pegable en UI).
- Verificación en **Rust** (`invoke`: estado, activar, código de instalación). No confiar solo en JS.

---

## Emisión (v1 — script manual)

Quién emite: el equipo Kai, con un script/CLI interno, por ejemplo:

```bash
issue-license --machine KSL-XXXX-XXXX-XXXX --licensee "Minimarket El Roble" --out license.kai
```

1. Cliente envía código de instalación (WhatsApp/mail).
2. Operador corre el script con la clave privada (vault / máquina de confianza).
3. Se entrega `license.kai` al cliente.
4. Cliente lo activa en la app.

No hay portal ni autoservicio en v1. Un log interno de emisiones (machineId, licensee, fecha) es recomendable.

---

## Trial (10 días)

- Arranca en el **primer uso** sin licencia (marcar timestamp firmado/HMAC o registro en app data gestionado desde Rust).
- Durante el trial: uso completo del producto (misma funcionalidad que licencia, salvo política comercial distinta si se define después).
- Al vencer **sin** licencia:
  - No borrar SQLite ni datos.
  - Bloquear POS/Admin operativos.
  - Permitir **Activar licencia** y **Backup/export**.
- Con licencia válida: el trial deja de aplicar.

---

## Cambio de máquina / disco

Si el fingerprint cambia y ya no coincide con la licencia:

- La app trata el estado como **no licenciada**.
- Si el trial ya se usó en ese equipo nuevo, no hay trial “extra” automático salvo reglas futuras (v1: trial por instalación/app data de esa máquina).
- Reactivación = **nueva emisión manual** (sin cupo gratis en el software).

Backup restaurado en otro PC: los datos pueden abrirse solo si hay licencia válida para **esa** máquina (o durante trial de esa máquina).

---

## Dónde vive en la arquitectura

| Capa | Rol |
|------|-----|
| Tauri / Rust | Fingerprint, verify, trial clock, persistencia de licencia, gate de arranque |
| UI | Pantalla Activación; aviso de días de trial; bloqueo post-trial |
| Core Lite sidecar | No arrancar (o arrancar en modo read-only) si Tauri indica licencia/trial inválido |

Fuente de verdad: **Tauri**, no el SQLite de negocio.

---

## Fuera de alcance v1

- Portal web de emisión / pago online.
- Reactivaciones automáticas o cupo de transferencias.
- Límite de usuarios en la licencia.
- DRM anti-tamper avanzado (objetivo: fricción comercial + soporte).
