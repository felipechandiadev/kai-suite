# KaiStore StockControl (`kai-stock`)

PWA móvil para inventario: escaneo de código/SKU, consulta de stock por almacén, ajustes, transferencias y actualización de código de barras.

## Desarrollo

```bash
cd kai-stock
cp .env.local.example .env.local   # si no existe .env.local
npm install
npm run dev   # http://localhost:3033
```

El login está en **`/`** (igual que POS y admin). Tras iniciar sesión se abre **`/scan`**. El ícono de **configuración** (esquina inferior derecha) abre `/setup` para elegir la empresa del dispositivo. La selección se guarda en `localStorage` (`flowstore-stock-company`).

Backend NestJS en **5060** (`BACKEND_API_URL`).

## Rutas (App Router)

| Ruta | Uso |
|------|-----|
| `/scan` | Escáner + modo código/SKU; enlace al buscador |
| `/search` | Buscador SSR de variantes; cards paginadas; URL `?q=&page=&limit=`; `limit` persistido en `localStorage` |
| `/variant/[variantId]` | Ficha de variante y stock por almacén |
| `/variant/[variantId]/barcode` | Actualizar código de barras |
| `/product/create?code=&mode=` | Alta rápida tras escaneo sin coincidencia (sin PMP; stock en almacén por defecto) |

Rutas legacy (`/variant`, `/variant?variantId=`, `/variant/barcode?variantId=`) redirigen a las rutas anteriores.

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `BACKEND_API_URL` | API NestJS (servidor) |
| `NEXTAUTH_URL` | Origen de esta app (3033) |
| `NEXTAUTH_SECRET` | Secreto NextAuth |
| `NEXT_PUBLIC_COMPANY_ID` | Empresa activa (tenant) |
| `NEXT_PUBLIC_APP_NAME` | Nombre visible |

## Endpoints usados

| Acción | Método | Ruta |
|--------|--------|------|
| Login | POST | `/api/auth/login` |
| Lookup variante | GET | `/api/product-variants/scan/by-code?value=&by=barcode\|sku` |
| Detalle variante | GET | `/api/product-variants/:id` |
| Actualizar barcode | PUT | `/api/product-variants/:id` |
| Stock por variante | GET | `/api/inventory?search=` |
| Ajuste | POST | `/api/inventory/adjust` |
| Transferencia | POST | `/api/inventory/transfer` |
| Almacenes | GET | `/api/inventory/filters` |
| Inicializar stock (nivel 0) | PATCH | `/api/inventory/stock-levels/thresholds` |
| Crear producto / variante | POST | `/api/products`, `/api/product-variants` |

## Arquitectura

Server Actions → Use cases → Domain (Zod) → Infrastructure (`*.request.ts`). Sin `fetch` en componentes ni hooks.
