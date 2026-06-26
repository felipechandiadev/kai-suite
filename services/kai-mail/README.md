# KAI Mail Service

Microservicio liviano para envío de correos transaccionales (eShop y futuros módulos).

## Stack

- NestJS + BullMQ + Redis + Nodemailer + Handlebars
- Sin base de datos en v1

## Desarrollo local

```bash
cd services/kai-mail
npm install
# Redis en localhost (docker compose del backend)
REDIS_HOST=localhost SMTP_HOST=localhost SMTP_PORT=1025 npm run start:dev
```

Con Mailpit:

```bash
docker compose -f docker-compose.mail.yml up mailpit
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

Variables en `backend/.env`:

```
ESHOP_CHECKOUT_V2=true
KAI_MAIL_URL=http://localhost:5040
KAI_MAIL_API_KEY=dev-kai-mail-key
```
