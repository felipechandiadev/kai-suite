# KDS: autenticación firmada + WebSocket con token (Fase 2)

Continúa `docs/waiter-signed-auth.md` (Fase 1). Mismo patrón que kai-waiter.

## Alcance
### kai-kds
- Login (server action `kdsLoginAction`) guarda `accessToken`/`refreshToken` de kai-core en cookies
  `httpOnly`, `sameSite=lax`, `secure` en producción: `kai_kds_at` / `kai_kds_rt`
  (nombres distintos a waiter para no colisionar si comparten host).
- Todas las server actions (cola, historial, unidades, marcar listo, cambio de contraseña,
  web push) toman la identidad de la cookie (`requireKdsAuth`, refresca si caducó).
  `userId`/`companyId` del cuerpo se ignoran; quedan en localStorage solo como presentación.
- Web push: el navegador ya no hace `fetch` con `Bearer ${userId}`; lo hacen las server actions
  `fetchKdsVapidPublicKeyAction` / `subscribeKdsWebPushAction`.
- Layout `(app)`: si no hay cookie válida (`hasKdsAuthAction`) limpia localStorage y va a `/login`.
- Cerrar sesión, cambiar contraseña y un 401 detectado borran cookies (`kdsLogoutAction`;
  `changePasswordAction` las borra en servidor al tener éxito).

### WebSocket
- kai-core: `POST /api/auth/socket-token` (requiere access token) devuelve un JWT `typ=ws`
  de corta vida (`JWT_WS_EXPIRES_IN`, por defecto `60s`), firmado con `JWT_SECRET`.
  `TenantGuard` lo rechaza en HTTP (exige `typ=access`).
- Gateways `dining-realtime`, `catalog-realtime`, `stock-realtime` y `notifications` leen
  `auth.token` (prioritario) o `auth.userId` y validan con `resolveWsTenant`:
  - JWT (`typ=ws` o `access`): firma + `exp`; empresa = header (SUPER_ADMIN) o `cid` si el
    usuario tiene membership, si no `user.companyId`.
  - UUID crudo: solo si `AUTH_ALLOW_LEGACY_UUID_BEARER` lo permite; se registra
    `Legacy UUID en handshake WS <gateway> user=xxxxxxxx…` por conexión.
- kai-kds: `io(..., { auth: (cb) => ... })` pide en **cada** (re)conexión un token ws nuevo
  mediante la server action `getKdsSocketTokenAction` (que usa la cookie). Si la sesión no es
  válida, redirige a login.

**Por qué un token ws de corta vida y no exponer el access token:** el access token (15 min,
válido para toda la API HTTP) nunca sale de la cookie httpOnly; el navegador solo recibe un
token que (a) caduca en ~60 s y (b) no sirve para HTTP. Socket.IO solo lo usa en el handshake,
así que la conexión establecida no se corta al caducar; cada reconexión pide uno nuevo.
Alternativas descartadas: cookie en el handshake (KDS y kai-core están en orígenes distintos,
requeriría cookies cross-site y CORS con credenciales), o devolver el access token al cliente
(anula el beneficio de httpOnly).

### Indicador de conexión
- `kds-connection-state.ts` (puro, con tests): `connecting → connected → reconnecting → offline`.
  Tras 5 s caído pasa a "Sin conexión" y suena la alerta (2 toques, `playKdsAlertSound`);
  al recuperarse suena 1 vez. No suena si nunca conectó (arranque).
- Reintento: backoff exponencial con jitter de socket.io (1 s → 15 s) y, si el servidor corta
  (`io server disconnect`, p. ej. token rechazado), reintento manual con `kdsReconnectDelayMs`.
- `KdsTopBar` muestra el badge "Conectado / Conectando / Reconectando / Sin conexión".

## Variables
| Variable | Dónde | Defecto | Uso |
|---|---|---|---|
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | kai-core | — | Firma (ya existentes) |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | kai-core | 15m / 7d | Fase 1 |
| `JWT_WS_EXPIRES_IN` | kai-core | 60s | Token de handshake WS |
| `AUTH_ALLOW_LEGACY_UUID_BEARER` | kai-core | false en production, true en otros | HTTP **y** WS |
| `KDS_COOKIE_SECURE` | kai-kds | `secure` si production | Forzar `true/false` (p. ej. LAN http) |

## Riesgos
- **Otros clientes WS** (waiter, pos, admin, stock, eshop…) siguen enviando `auth.userId`:
  funcionan solo mientras `AUTH_ALLOW_LEGACY_UUID_BEARER` sea true. En producción sin la
  variable, sus sockets se rechazan (antes no dependían de ella). Definirla explícitamente
  hasta migrarlos y vigilar el log `Legacy UUID en handshake WS`.
- Cambio de semántica menor: si un cliente envía `auth.token` y `auth.userId` distintos, ahora
  gana `token` (antes `userId`). No se encontró ningún cliente que lo haga, pero no se auditó
  cada app.
- `dining-board-realtime` (pantallas con `displayToken`) no cambia.
- Sesiones KDS abiertas antes del despliegue no tienen cookie: deben reloguear.
- Tokens no revocables; logout borra cookies. Refresh robado vale hasta 7 días.
- Next.js en producción oculta el mensaje de errores lanzados en server actions, así que
  `redirectToLoginIfUnauthorized` puede no detectar 401 por texto (problema previo); el layout
  y el socket sí redirigen a login.

## Oportunidad
`kds-auth-cookies.ts`, `kds-auth.server.ts` y gran parte de `backend-api.ts` duplican los de
kai-waiter: candidato a un paquete compartido (`packages/pwa-auth`) en una tarea aparte.
