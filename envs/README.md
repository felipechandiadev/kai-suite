# Variables de entorno — desarrollo local

Puertos PWAs en rango **503x**; backend y kai-mail en **5030** / **5040**.

## Uso rápido

**Primera vez** (o para resetear plantillas):

```bash
npm run env:dev
# equivalente: ./envs/sync-dev-envs.sh --force
```

**Solo crear archivos faltantes** (no sobrescribe los que ya tienes):

```bash
./envs/sync-dev-envs.sh
```

`npm run dev` **ya no** ejecuta el sync automáticamente (evita pisar tus `.env` y alertas de Cursor).

## Puertos por app

| App        | Puerto | Archivo destino              |
|------------|--------|------------------------------|
| Backend    | 5030   | `backend/.env`               |
| pwa-admin  | 5031   | `pwa-admin/.env.local`       |
| pwa-pos    | 5032   | `pwa-pos/.env.local`         |
| pwa-stock  | 5033   | `pwa-stock/.env.local`       |
| pwa-eshop  | 5034   | `pwa-eshop/.env.local`       |
| kai-mail   | 5040   | `services/kai-mail/.env`     |

## Notas

- Las plantillas `envs/*.env` y `envs/*.env.local` están en `.gitignore` (secretos de dev).
- `NEXT_PUBLIC_COMPANY_ID` en POS/Stock debe coincidir con la empresa del seed (Joyarte u otra).
- `NEXT_PUBLIC_ESHOP_STORE_SLUG` debe coincidir con `settings.eShopPublicSlug` de la empresa.
- eShop usa **solo** `pwa-eshop/.env.local` (no `.env.development.local`).
- Si pruebas desde otro equipo en la LAN, reemplaza `localhost` por la IP del host en URLs y `CORS_ORIGIN` del backend.
