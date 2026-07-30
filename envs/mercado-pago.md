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
| Nombre | `Mercado PAGO POS-Kai` |
| Nombre corto | `POS-Kai` |
| Descripción | Integración POS / eShop sandbox Kai |
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
| N.º aplicación | `903290524630763` |
| User ID | `3539346207` |
| Public Key | `APP_USR-ad2ff5e6-d9c1-423f-9783-9d52c4ef1325` |
| Access Token | `APP_USR-903290524630763-071322-7f1881da338659b1355e50aa6668acc8-3539346207` |

### Variables para seed / `.env` local (opcional)

```bash
# envs/mercado-pago.env (gitignored)
SEED_MP_PUBLIC_KEY=APP_USR-ad2ff5e6-d9c1-423f-9783-9d52c4ef1325
SEED_MP_ACCESS_TOKEN=APP_USR-903290524630763-071322-7f1881da338659b1355e50aa6668acc8-3539346207
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
  "publicKey": "APP_USR-ad2ff5e6-d9c1-423f-9783-9d52c4ef1325",
  "accessToken": "APP_USR-903290524630763-071322-7f1881da338659b1355e50aa6668acc8-3539346207",
  "eshopOnlinePaymentEnabled": true,
  "eshopDefaultPaymentMode": "online",
  "posPointEnabled": false,
  "pointTerminalId": null
}
```

Verificar checkout:

```http
GET http://localhost:5060/api/e-shop/demo/payment-settings
```

---

## Usuario de prueba (comprador / login MP)

| Campo | Valor |
|-------|-------|
| Usuario (vendedor) | `TESTUSER8518257586319726280` |
| Contraseña | `1sHAw9RU0T` |
| Código verificación | `346207` |

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

1. Carrito → Checkout → paso **Resumen** → **Continuar al pago** (modo *Pagar ahora*).
2. Redirect a **`/checkout/payment?orderId=…`**: la página llama `POST /e-shop/checkout/resume-payment` y monta el Payment Brick (**Cuenta Mercado Pago** o **tarjeta**).

| Método | Cómo probar |
|--------|-------------|
| **Tarjeta** | Visa `4168 8188 4444 7115`, CVV `123`, venc. `11/30`, titular **`APRO`** |
| **Cuenta MP** | Usuario de prueba del panel MP; completar pago en wallet/QR |

3. Tarjeta: confirmación vía `POST /v1/orders` (API Orders) → sync PAID + email + notify admin.
4. Wallet: MP procesa con `preferenceId`; KaiStore hace polling + webhook **Payment** u **Order**.
5. Success: `/checkout/confirmacion?orderId=…&doc=…&paid=1&email=…`. Failure/pending: `/checkout/failure` y `/checkout/pending` (retry con el mismo `orderId`).

> Smoke sandbox: review → payment page → titular **APRO** → confirmación con `orderId` + `paid=1` y correo `order.received`.

Variables backend:

```bash
MP_WEBHOOK_BASE_URL=http://localhost:5060   # o URL ngrok del API
ESHOP_PUBLIC_SITE_URL=http://localhost:5064   # local OK; back_urls solo si es dominio público (https)
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
| Clave secreta | Copiar del panel → `MP_WEBHOOK_SECRET` en `kai-core/.env` |

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

- [ ] Migración `payment_gateway_intents` (`cd kai-core && npm run migration:run`)
- [ ] Credenciales en Admin → Integraciones (Sandbox)
- [ ] eShop → Integraciones: pago online ON
- [ ] Tienda demo habilitada (`demo`) + métodos de entrega
- [ ] `GET .../payment-settings` → `onlinePaymentEnabled: true`
- [ ] `MP_WEBHOOK_BASE_URL` / ngrok y `ESHOP_PUBLIC_SITE_URL` (back_urls en prod)
- [ ] Rutas: `/checkout/payment?orderId=`, confirmación con `paid=1` + `orderId`
- [ ] Checkout Payment Brick: tarjeta `APRO` o Cuenta MP (wallet/QR)
- [ ] Tras APRO: email `order.received` + notificación admin (solo al aprobar, no en prepare)
- [ ] (Opcional) Webhook Order + Payment + `MP_WEBHOOK_SECRET` + ngrok

Pedidos PENDING abandonados: no hay job de limpieza masiva; ver [IF-12](../docs/implementaciones-futuras/IF-12-mercado-pago-pos-y-eshop.md) si aplica.
