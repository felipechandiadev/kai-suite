# KAI Mail Service

Microservicio liviano para envío de correos transaccionales (eShop y futuros módulos).

## Stack

- NestJS + BullMQ + Redis + Nodemailer + Handlebars
- Sin base de datos en v1
- **npm workspace** del monorepo (`services/kai-mail` en el root `package.json`)

## Desarrollo local

Desde la **raíz** del monorepo (un solo `npm install` / `node_modules` compartido):

```bash
npm install
# Redis en localhost (docker compose del backend)
REDIS_HOST=localhost SMTP_HOST=localhost SMTP_PORT=1025 npm run mail:dev
# equivalente: npm run start:dev -w kai-mail
```

Build:

```bash
npm run mail:build
```

Con Mailpit (desde `services/kai-mail`):

```bash
docker compose -f services/kai-mail/docker-compose.mail.yml up mailpit
```

UI Mailpit: http://localhost:8025

## API

```http
POST /v1/mail/send
Authorization: Bearer dev-kai-mail-key

{
  "template": "order.received",
  "to": "cliente@example.com",
  "variables": {
    "customerName": "María",
    "orderNumber": "PED-001",
    "total": "125000",
    "fulfillmentMethod": "Retiro en tienda",
    "storeName": "Joyarte"
  },
  "idempotencyKey": "order:uuid:received"
}
```

## Integración backend KaiStore

Variables en `kai-core/.env`:

```
ESHOP_CHECKOUT_V2=true
KAI_MAIL_URL=http://localhost:5040
KAI_MAIL_API_KEY=dev-kai-mail-key
```

## Docker

El [`Dockerfile`](./Dockerfile) sigue haciendo `npm install` en el contexto de la imagen (deploy independiente del workspace local).
