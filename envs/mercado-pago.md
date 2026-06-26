# Mercado Pago — credenciales sandbox (Chile)

Referencia local para desarrollo. **No commitear** si el repo es público; preferir `envs/mercado-pago.env` (gitignored) para tokens.

| Campo | Valor |
|-------|-------|
| País | Chile |
| Entorno KaiStore | `sandbox` |
| Implementación | [IF-12](../docs/implementaciones-futuras/IF-12-mercado-pago-pos-y-eshop.md) |
| Guía operativa | [credenciales-sandbox-y-pruebas.md](../docs/implementaciones-futuras/integraciones/mercado-libre/credenciales-sandbox-y-pruebas.md) |

---

## Aplicación MP

| Campo | Valor |
|-------|-------|
| Nombre | `demo-kai-online` |
| Nombre corto | `demo-kai-online` |
| Descripción | Mi aplicación demo-kai-online |
| Tipo de solución | Pagos online |
| Plataforma e-commerce | No |
| Producto | Checkout API |
| API | API Orders |
| Panel | [Tus integraciones](https://www.mercadopago.cl/developers/panel/app) |
| Logos | `assets/integrations/mercado-pago/` (RGB Handshake 2025) |

---

## Credenciales de prueba (pestaña Prueba)

| Campo | Valor |
|-------|-------|
| N.º aplicación | `6039914461023924` |
| User ID | `3499033891` |
| Public Key | `APP_USR-0223b3a0-7324-407e-a977-e907e150367f` |
| Access Token | `APP_USR-6039914461023924-062612-415fa86eed2b918a4e9294c06565f217-3499033891` |

> Las claves `APP_USR-...` pueden aparecer en la pestaña **Prueba** de Chile. En admin/seed usar siempre `environment: sandbox`.

### Variables para seed / `.env` local (opcional)

```bash
# envs/mercado-pago.env (gitignored)
SEED_MP_PUBLIC_KEY=APP_USR-0223b3a0-7324-407e-a977-e907e150367f
SEED_MP_ACCESS_TOKEN=APP_USR-6039914461023924-062612-415fa86eed2b918a4e9294c06565f217-3499033891
SEED_MP_ENVIRONMENT=sandbox
```

### Dónde pegarlas en KaiStore

| Pantalla | Ruta | Qué configurar |
|----------|------|----------------|
| Integraciones | Admin → Configuración → Integraciones | ON, Sandbox, Public Key, Access Token |
| Checkout eShop | Admin → eShop → Integraciones | Pago online ON, modo por defecto **Pagar ahora** |

Bloque en `companies.settings.mercadoPago` (seed):

```json
{
  "enabled": true,
  "environment": "sandbox",
  "publicKey": "APP_USR-0223b3a0-7324-407e-a977-e907e150367f",
  "accessToken": "APP_USR-6039914461023924-062612-415fa86eed2b918a4e9294c06565f217-3499033891",
  "eshopOnlinePaymentEnabled": true,
  "eshopDefaultPaymentMode": "online",
  "posPointEnabled": false,
  "pointTerminalId": null
}
```

Verificar checkout:

```http
GET http://localhost:5030/api/e-shop/joyarte/payment-settings
```

---

## Usuario de prueba (comprador / login MP)

| Campo | Valor |
|-------|-------|
| Usuario | `TESTUSER1559147931193270395` |
| Contraseña | `1LCthzVx9F` |
| Código verificación | `033891` |

No requerido para **Checkout Bricks** con tarjeta; útil para flujos con cuenta MP o Point.

---

## Tarjetas de prueba

Documentación: [Tarjetas de prueba Chile](https://www.mercadopago.cl/developers/es/docs/checkout-api-payments/integration-test/test-cards)

| Marca | Número | CVV | Vencimiento |
|-------|--------|-----|-------------|
| Mastercard | `5416 7526 0258 2580` | `123` | `11/30` |
| Visa | `4168 8188 4444 7115` | `123` | `11/30` |
| American Express | `3757 781744 61804` | `1234` | `11/30` |
| Mastercard Débito | `5241 0198 2664 6950` | `123` | `11/30` |
| Visa Débito | `4023 6535 2391 4373` | `123` | `11/30` |

### Nombre del titular → resultado simulado

| Titular | Resultado | Documento identidad |
|---------|-----------|---------------------|
| `APRO` | Pago aprobado | (otro) `123456789` |
| `OTHE` | Rechazado — error general | — |
| `CONT` | Pendiente de pago | — |
| `CALL` | Rechazado — requiere autorización | — |
| `FUND` | Rechazado — fondos insuficientes | — |
| `SECU` | Rechazado — CVV inválido | — |
| `EXPI` | Rechazado — vencimiento | — |
| `FORM` | Rechazado — error de formulario | — |

### Flujo rápido eShop (Payment Brick)

1. Carrito → Checkout → paso **Resumen** → **Pagar ahora con Mercado Pago**.
2. Paso **Pago**: Payment Brick con **Cuenta Mercado Pago** (login / QR app) o **tarjeta**.

| Método | Cómo probar |
|--------|-------------|
| **Tarjeta** | Visa `4168 8188 4444 7115`, CVV `123`, venc. `11/30`, titular **`APRO`** |
| **Cuenta MP** | Usuario de prueba del panel MP; completar pago en wallet/QR |

3. Tarjeta: confirmación vía `POST /v1/orders` (API Orders).
4. Wallet: MP procesa con `preferenceId`; KaiStore hace polling + webhook **Payment** u **Order**.

Variables backend:

```bash
MP_WEBHOOK_BASE_URL=http://localhost:5030   # o URL ngrok del API
ESHOP_PUBLIC_SITE_URL=http://localhost:5034   # local OK; back_urls solo si es dominio público (https)
```

> En **localhost**, KaiStore omite `back_urls` / `auto_return` al crear la preferencia (MP los rechaza). El Payment Brick y el polling siguen funcionando. En producción usá `ESHOP_PUBLIC_SITE_URL=https://tu-dominio.cl`.

---

## Webhooks (tópicos Order y Payment)

Configurar en [Tus integraciones](https://www.mercadopago.cl/developers/panel/app) → **Webhooks > Configurar notificaciones**:

| Campo | Valor |
|-------|-------|
| Eventos | **Order (Mercado Pago)** y **Payment** |
| URL producción | `https://<tu-dominio>/api/webhooks/mercado-pago` |
| URL dev (ngrok) | `https://<subdominio>.ngrok-free.app/api/webhooks/mercado-pago` |
| Clave secreta | Copiar del panel → `MP_WEBHOOK_SECRET` en `backend/.env` |

Ejemplo de notificación:

```json
{
  "action": "order.updated",
  "type": "order",
  "data": { "id": "ORD01..." }
}
```

Query params: `?data.id=ORD01...&type=order`. Headers: `x-signature`, `x-request-id`.

KaiStore valida la firma HMAC si `MP_WEBHOOK_SECRET` está definido; luego hace `GET /v1/orders/{id}` y actualiza el pedido eShop.

Sin ngrok el flujo **Brick + confirm-payment** basta para pruebas locales; el webhook sincroniza pagos asíncronos (`processing` → `processed`).

---

## Checklist

- [ ] Migración `payment_gateway_intents` (`cd backend && npm run migration:run`)
- [ ] Credenciales en Admin → Integraciones (Sandbox)
- [ ] eShop → Integraciones: pago online ON
- [ ] Tienda Joyarte habilitada (`joyarte`) + métodos de entrega
- [ ] `GET .../payment-settings` → `onlinePaymentEnabled: true`
- [ ] Checkout Payment Brick: tarjeta `APRO` o Cuenta MP (wallet/QR)
- [ ] (Opcional) Webhook Order + Payment + `MP_WEBHOOK_SECRET` + ngrok
