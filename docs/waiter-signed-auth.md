# Waiter: autenticación firmada (Fase 1)

## Problema
`kai-waiter` (y el resto de PWAs) se autentican contra `kai-core` con
`Authorization: Bearer <userId>`. `TenantGuard` (`kai-core/src/common/tenant/tenant.guard.ts`)
solo verifica que el bearer sea el UUID de un usuario existente: sin firma ni caducidad.
Cualquiera que conozca un UUID de usuario puede actuar como él. En waiter, además, las
server actions recibían `userId`/`companyId` desde el cliente (localStorage).

## Inventario (antes del cambio)
`TenantGuard` es `APP_GUARD` global (`TenantModule`): aplica a los ~135 controladores de
`kai-core` salvo los marcados con `@SkipTenant()` (27 archivos: login/logout, catálogos
públicos, e-shop público, board, etc.). Por lo tanto **todas** las rutas autenticadas
dependen del formato `Bearer <uuid>`.

Apps que envían `Bearer ${...}` con el userId (archivos con el patrón, aprox.):

| App | Archivos | Notas |
|-----|----------|-------|
| kai-admin | ~123 | Fetch desde server actions y cliente |
| kai-pos | ~37 | |
| kai-stock | ~4 | |
| kai-eshop | ~3 | Back-office; el carrito público usa `cartToken` (no afectado) |
| kai-kds | ~2 | |
| kai-sami | ~1 | |
| kai-waiter | ~3 | Migrada en esta fase |
| kai-board, kai-menu, kai-delivery, kai-store-lite, printers | 0 | No usan el bearer UUID (o usan display token / endpoints públicos) |

WebSockets: `dining-realtime`, `catalog-realtime`, `stock-realtime` y `notifications`
autentican en el handshake con `auth.userId` vía `WsTenant`, **sin pasar por `TenantGuard`**.
No se cambian en esta fase.

## Alcance Fase 1
- `POST /api/auth/login` devuelve además `accessToken` (JWT HS256, `JWT_SECRET`,
  caducidad `JWT_ACCESS_EXPIRES_IN`, por defecto `15m`), `refreshToken`
  (`JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`, por defecto `7d`) y `expiresIn` (s).
  Los campos previos no cambian, así que las demás apps siguen funcionando.
- `POST /api/auth/refresh` (`{ refreshToken }`) emite un par nuevo si el usuario sigue existiendo.
- Claims: `sub` (userId), `cid` (empresa activa del login, puede ser null), `typ`
  (`access`|`refresh`), `iat`, `exp`. Se valida `alg=HS256`, firma (comparación en tiempo
  constante), `typ` y `exp`.
- `TenantGuard`: si el bearer es un JWT, valida firma/caducidad y toma el usuario de `sub`.
  La empresa activa es la del header `X-Active-Company-Id` o, si falta, `cid`; en ambos
  casos se exige membership (o SUPER_ADMIN) como antes.
- `JWT_EXPIRES_IN` (24h en los `.env` actuales) no se usa para el access token, para no
  heredar una caducidad larga; queda reservado.
- kai-waiter: el login (server action) guarda access/refresh en cookies `httpOnly`,
  `sameSite=lax`, `secure` en producción (forzable con `WAITER_COOKIE_SECURE=true|false`).
  Todas las server actions (salón, menú, cuenta, impresoras, notificaciones, web push,
  cambio de contraseña) obtienen la identidad de la cookie y refrescan el token si caducó.
  `userId`/`companyId` siguen en localStorage solo como datos de presentación y para el
  handshake de WebSocket (fuera de alcance), nunca como credencial HTTP.

## Bearer UUID antiguo (modo compatibilidad)
Variable `AUTH_ALLOW_LEGACY_UUID_BEARER`:

| NODE_ENV | Valor por defecto | Efecto |
|----------|-------------------|--------|
| production | `false` | **Modo seguro**: solo JWT; bearer UUID → 401 |
| otro (development/test) | `true` | Acepta UUID, con `warn` en log por cada uso |

Cada uso del bearer UUID se registra (`Legacy UUID bearer usado: METHOD path user=xxxxxxxx…`).

## Riesgos
- **Producción**: desplegar este `kai-core` con `NODE_ENV=production` sin definir
  `AUTH_ALLOW_LEGACY_UUID_BEARER=true` rompe kai-admin, kai-pos, kai-stock, kai-eshop
  (back-office), kai-kds y kai-sami (401). Hasta migrarlas, definir explícitamente
  `AUTH_ALLOW_LEGACY_UUID_BEARER=true` y vigilar los logs.
- Los tokens no son revocables (sin lista negra); logout de waiter borra cookies. Un
  refresh token robado vale hasta 7 días. Cambiar `JWT_REFRESH_SECRET` invalida todos.
- WebSockets siguen aceptando userId en el handshake.
- Sesiones de waiter abiertas antes del despliegue no tienen cookie: deben reloguear.

## Pasos de migración
1. Desplegar kai-core con `AUTH_ALLOW_LEGACY_UUID_BEARER=true` en producción + kai-waiter nuevo.
2. Verificar en logs que waiter ya no aparece en usos legacy.
3. Migrar app por app (pos, kds, stock, eshop, sami, admin) al mismo patrón cookie/JWT.
4. Migrar el handshake de WebSockets a JWT.
5. Cuando los logs legacy estén a cero, quitar la variable (modo seguro por defecto).
