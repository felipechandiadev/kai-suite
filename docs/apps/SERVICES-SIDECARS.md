# Sidecars (`services/`) — patrón Kai Mail y migración OSRM

Microservicios auxiliares del monorepo: procesos con **ciclo de vida propio** que **Kai Core** (`kai-core`) consume por HTTP. No son apps instalables de la suite (PWA/nativos).

**Última revisión:** julio 2026  
**Relacionado:** [`NAMING-SUITE.md`](./NAMING-SUITE.md) §5 · reparto/OSRM producto: [`REPARTO-MULTI-CANAL.md`](../project/REPARTO-MULTI-CANAL.md) · envs: [`envs/README.md`](../../envs/README.md)

---

## 1. Qué es `services/`

| Servicio | Rol | Puerto típico | Stack |
|----------|-----|---------------|--------|
| `services/kai-mail` | Correo transaccional (eShop y módulos) | **5040** | Nest + BullMQ + Redis + Nodemailer — **npm workspace** del monorepo |
| `services/kai-voice` | TTS para Kai Board | **5041** | Python + edge-tts (`.venv`; **no** workspace npm) |
| `services/kai-osrm` | Empaquetado ops de OSRM | **5001** | Imagen `osrm-backend` + datos — **no** Nest |

No meter aquí lógica de dominio ERP (eso sigue en Core). Solo satélites con API o motor externo.

**DX kai-mail:** desde la raíz, `npm install` + `npm run mail:dev` / `npm run mail:build` (`-w kai-mail`). No hace falta `npm install` dentro de `services/kai-mail`.

---

## 2. Patrón de integración (ejemplo: kai-mail)

```
kai-eshop / admin  →  backend (Kai Core)
                         │
                         │  KaiMailClient  (HTTP)
                         │  KAI_MAIL_URL + KAI_MAIL_API_KEY
                         ▼
                   services/kai-mail :5040
                         │
                         ▼
                   Redis + SMTP (Mailpit en local)
```

1. **Servicio independiente** en `services/kai-mail` — p. ej. `POST /v1/mail/send` con Bearer.
2. **Cliente delgado en Core** — `kai-core/src/shared/mail/kai-mail.client.ts`. Si no hay `KAI_MAIL_URL`, no envía (feature off).
3. **Config** vía `envs` → `KAI_MAIL_URL`, `KAI_MAIL_API_KEY`, `KAI_FEATURE_KAI_MAIL`.
4. **Negocio** (checkout, estados de pedido) solo llama al client; no conoce Nodemailer.

Mismo patrón en voice: `KAI_VOICE_URL` → `services/kai-voice`.

Referencia rápida: [`services/kai-mail/README.md`](../../services/kai-mail/README.md) · OSRM: [`services/kai-osrm/README.md`](../../services/kai-osrm/README.md).

---

## 3. OSRM hoy vs el patrón mail

| | **kai-mail** (`services/`) | **OSRM** (`services/kai-osrm`) |
|--|----------------------------|-------------------------------|
| Qué es | App Nest propia (lógica Kai) | Binario **third-party** (`osrm-backend`) |
| Dónde | `services/kai-mail` | `services/kai-osrm` (`docker-compose.osrm.yml`) |
| Datos / bootstrap | — | `services/kai-osrm/data/`, `scripts/osrm-bootstrap.sh` |
| Cliente en Core | `KaiMailClient` | `OsrmHttpClient` en `kai-core/src/modules/routing/` |
| Config | `KAI_MAIL_URL` | `OSRM_URL` / `osrm_url` por bodega (`delivery_settings`) |
| Fallback | No envía si no hay URL | Ruta estimada (línea recta / vecino más cercano) si OSRM cae |

OSRM **ya** se consume como servicio HTTP externo al proceso Nest. Lo que falta es homogeneizar el **empaquetado/ops** con `services/`, no reescribir el módulo `routing`.

---

## 4. Decisión de diseño

| Enfoque | Cuándo |
|---------|--------|
| Dejar OSRM en `kai-core/docker-compose` (perfil) | ~~Aceptable solo mientras la migración no esté hecha~~ — **retirado** |
| **Compose + datos + README bajo `services/kai-osrm`** | **Objetivo** — mismo modelo mental que mail: Core habla a una URL |
| Microservicio Nest que envuelva OSRM | **No** — no aporta salvo auth/multi-tenant encima del motor (fuera de alcance) |

**Resumen:** migrar ops de OSRM a `services/kai-osrm`; mantener `OsrmHttpClient` + `optimize-delivery-dispatch-route` en Core.

---

## 5. Tarea — migrar OSRM a `services/`

**Estado:** hecho (jul 2026)  
**Prioridad:** media (ops / claridad monorepo; no bloquea producto)  
**No mezclar** con rename `kai-core` → `kai-core` ni con `pwa-*` → `kai-*` en el mismo PR.

### 5.1 Objetivo

```
services/kai-osrm/
  README.md                 # Cómo levantar, OSRM_URL, bootstrap
  docker-compose.osrm.yml   # Servicio osrm (puerto 5001→5000)
  scripts/osrm-bootstrap.sh # Movido o wrapper desde kai-core/scripts
  data/                     # o volumen documentado (ex kai-core/osrm-data)
```

Core sigue con:

- `OSRM_URL=http://localhost:5001` (o URL de VPS)
- `kai-core/src/modules/routing/` sin cambios de contrato

### 5.2 Checklist de implementación

- [x] Crear `services/kai-osrm/` con compose + README (perfil/`docker compose -f … up`)
- [x] Mover o reubicar `osrm-bootstrap.sh` y documentar primera carga de mapa (`maule-parral.osrm` u otro extract)
- [x] Mover / enlazar `osrm-data` (gitkeep + `.gitignore` de binarios grandes si aplica)
- [x] Quitar (o dejar deprecated con comentario → nuevo path) el servicio `osrm` de `kai-core/docker-compose.yml`
- [x] Actualizar `envs/shared.env.example` / README envs: comentario “levantar desde `services/kai-osrm`”
- [x] Actualizar docs de reparto ([`REPARTO-MULTI-CANAL.md`](../project/REPARTO-MULTI-CANAL.md)) con el nuevo path
- [ ] Smoke: `OSRM_URL` → optimizar despacho en admin; fallback si el contenedor está down
- [ ] VPS/demo: documentar si OSRM corre en el mismo host o aparte (no hace falta hostname tipo `osrm.demo…` salvo que se exponga)

### 5.3 Fuera de alcance de esta tarea

- Cambiar algoritmo de ruteo o API OSRM
- Nest wrapper / API key delante de OSRM
- Renombrar módulo `routing` del backend
- Empaquetar mapas de otras regiones (solo documentar cómo añadir extract)

---

## 6. Criterio de “sidecar Kai”

Usar `services/<nombre>/` cuando:

1. Tiene proceso o contenedor **aparte** de Core, y
2. Core lo llama por **URL** (y opcionalmente API key), y
3. Puede desplegarse / reiniciarse sin redeploy completo del API.

| Candidato | ¿`services/`? |
|-----------|----------------|
| kai-mail, kai-voice | Sí (ya) |
| OSRM | Sí (ops) — **`services/kai-osrm`** |
| Postgres / Redis del monorepo | Suelen quedarse en compose de Core/infra; no hace falta clonar el patrón mail |
| Agentes Printers / CFD | Nativos en raíz (`kai-printers-*`); no van a `services/` |

---

## 7. Resumen

| Pregunta | Respuesta |
|----------|-----------|
| ¿Qué es `services/`? | Satélites HTTP (o motores) que Core consume |
| ¿Ejemplo canónico? | **kai-mail** + `KaiMailClient` |
| ¿OSRM es distinto? | Motor third-party; cliente ya existe; ops en **`services/kai-osrm`** |
| ¿Hacer Nest “kai-osrm”? | No |
| ¿Estado migración? | **Hecho** — checklist §5.2 (smoke/VPS opcional) |
