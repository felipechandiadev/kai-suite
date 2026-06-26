# Mercado Pago — Credenciales sandbox y pruebas en KaiStore

| Campo | Valor |
|-------|-------|
| **Alcance** | IF-12 — eShop Checkout Bricks + POS Point |
| **Entorno** | Sandbox / pruebas (Chile) |
| **Implementación** | [IF-12](../../IF-12-mercado-pago-pos-y-eshop.md) |

Guía operativa para obtener credenciales de **prueba** en Mercado Pago y configurarlas en KaiStore (admin local o staging).

---

## 1. Dónde conseguir las credenciales

### 1.1 Cuenta vendedor

1. Creá o iniciá sesión en [Mercado Pago Chile](https://www.mercadopago.cl/) con una **cuenta de vendedor** (no basta con cuenta de comprador).
2. Abrí el panel de desarrolladores: **[Tus integraciones](https://www.mercadopago.cl/developers/panel/app)**.

### 1.2 Crear aplicación

1. **Crear aplicación** (o elegí una existente).
2. Productos según canal:
   - **eShop (Bricks):** Checkout API / Checkout Bricks.
   - **POS (Point):** MP Point (terminal presencial).

Documentación oficial:

- [Detalle de aplicación](https://www.mercadopago.cl/developers/es/docs/your-integrations/application-details)
- [MP Point — crear aplicación](https://www.mercadopago.cl/developers/es/docs/mp-point/create-application)

### 1.3 Credenciales de prueba

En la aplicación, sección **Credenciales** → pestaña **Prueba** (no Producción):

| Credencial | Formato típico | Dónde se usa en KaiStore |
|------------|----------------|--------------------------|
| **Public Key** | `TEST-...` | Admin + Payment Brick en el checkout eShop |
| **Access Token** | `TEST-...` | Solo backend (nunca en el navegador del cliente) |

Documentación: [Credenciales](https://www.mercadopago.cl/developers/es/docs/your-integrations/credentials)

> **Importante:** Usá siempre credenciales **TEST** mientras desarrollás. En admin, el entorno debe ser **Sandbox**.

---

## 2. Dónde pegarlas en KaiStore (admin)

### 2.1 Cuenta y tokens (una sola vez)

**Configuración → Integraciones** (`/settings/integrations`):

| Campo | Valor en pruebas |
|-------|------------------|
| Integración habilitada | ON |
| Entorno | **Sandbox (pruebas)** |
| Public Key | `TEST-...` del panel MP |
| Access Token | `TEST-...` del panel MP |

La sección **POS — Mercado Pago Point** (terminal, cobro en caja) solo aplica si probás Point; no es necesaria para el eShop.

### 2.2 Comportamiento del checkout eShop

**eShop → Integraciones** (`/e-shop/integrations`):

| Campo | Valor recomendado para pruebas |
|-------|--------------------------------|
| Permitir pagar en línea en el checkout | ON |
| Modo por defecto | Pagar ahora (Mercado Pago) |

Las credenciales **no** se duplican en esta pantalla; solo se activa el checkout online y el modo por defecto.

### 2.3 Tienda eShop activa

**Configuración → Empresa → eShop** (`/settings/company#eshop`):

- Tienda en línea habilitada → ON  
- Slug público alineado con `NEXT_PUBLIC_ESHOP_STORE_SLUG` del eShop (ej. `demo`)

Además: al menos un método en **eShop → Encargos y envíos** (`/e-shop/fulfillment`).

---

## 3. Prerrequisitos técnicos (desarrollo local)

| Requisito | Notas |
|-----------|--------|
| Backend en `http://localhost:3030` | API NestJS |
| Admin en `http://localhost:4031` | Configuración |
| eShop en `http://localhost:4034` | Checkout con Bricks |
| Migración `payment_gateway_intents` | `cd backend && npm run migration:run` |
| `ESHOP_CHECKOUT_V2=true` en `backend/.env` | Solo para flujo **encargo**; pago online usa `/checkout/prepare` |

Verificar que el checkout vea MP:

```http
GET http://localhost:3030/api/e-shop/{slug}/payment-settings
```

Respuesta esperada (ejemplo):

```json
{
  "onlinePaymentEnabled": true,
  "publicKey": "TEST-...",
  "environment": "sandbox",
  "defaultPaymentMode": "online"
}
```

Si `onlinePaymentEnabled` es `false`, revisar pasos 2.1 y 2.2.

---

## 4. Tarjetas de prueba (eShop — Checkout Bricks)

Documentación oficial: [Tarjetas de prueba Chile](https://www.mercadopago.cl/developers/es/docs/checkout-api-payments/integration-test/test-cards)

Valores habituales en sandbox:

| Campo | Valor |
|-------|--------|
| Número | `5031 7557 3454 0604` |
| CVV | `123` |
| Vencimiento | Cualquier fecha futura |
| Nombre del titular | **`APRO`** → pago aprobado |

Otros nombres de titular simulan otros resultados (`OTHE`, `CONT`, etc.).

### Flujo de prueba en la tienda

1. Agregar productos al carrito → Checkout.  
2. En **Revisar**, elegir **Pagar ahora (Mercado Pago)**.  
3. Completar el Brick con tarjeta de prueba.  
4. Confirmación con pago aprobado si MP responde `approved`.

---

## 5. MP Point (POS) — requisitos extra

Además de Public Key y Access Token en **Configuración → Integraciones**:

| Paso | Acción |
|------|--------|
| Terminal | Emparejar Point con la app Mercado Pago en el celular |
| Admin | Activar **Cobro con terminal Point en caja** |
| Admin | Ingresar **ID terminal / dispositivo Point** |
| POS | Botón **Cobrar con Point** en pantalla de pago |

Guías:

- [MP Point — overview](./mp-point.md)  
- [Configurar terminal](https://www.mercadopago.cl/developers/es/docs/mp-point/configure-terminal)  
- [Pruebas de integración Point](https://www.mercadopago.cl/developers/es/docs/mp-point/integration-test)

---

## 6. Webhook (opcional en local)

Para notificaciones asíncronas de MP al backend:

| Item | Valor |
|------|--------|
| URL pública (dev) | `https://<ngrok>/api/webhooks/mercado-pago` |
| Método | `POST` |
| Configuración | En la app MP → Webhooks / notificaciones |

En local **sin ngrok** podés probar el Brick y `confirm-payment`; el webhook mejora la sincronización del pedido si MP notifica después del pago.

Variable de entorno relacionada (deploy): `MP_WEBHOOK_BASE_URL`.

---

## 7. Checklist rápido

- [ ] App creada en [Tus integraciones](https://www.mercadopago.cl/developers/panel/app)  
- [ ] Public Key y Access Token **TEST** copiados  
- [ ] Admin → Integraciones: integración ON, Sandbox, credenciales guardadas  
- [ ] Admin → eShop → Integraciones: pago online ON  
- [ ] Tienda eShop habilitada + slug + fulfillment  
- [ ] Migración `payment_gateway_intents` ejecutada  
- [ ] Prueba checkout con tarjeta `APRO`  
- [ ] (Opcional) Point emparejado + webhook con ngrok  

---

## 8. Enlaces relacionados en el repo

- [IF-12 — Mercado Pago POS + eShop](../../IF-12-mercado-pago-pos-y-eshop.md)  
- [Checkout API / Bricks — referencia](./checkout-api-payments.md)  
- [MP Point — referencia](./mp-point.md)  
- [Índice integraciones](../README.md)
