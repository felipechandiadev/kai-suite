# Variables de entorno — desarrollo local

Puertos PWAs en rango **503x**; backend y kai-mail en **5030** / **5040**.

## Modelo: matriz + fragmentos

```
envs/shared.env.example     ← matriz (deploy + infra + secretos + seed)
        +
envs/backend.env.example    ← solo lo específico del API
envs/pwa-*.env.local.example
envs/kai-delivery.env.local.example
        ↓
envs/sync-dev-envs.sh       ← merge + proyección
        ↓
backend/.env, pwa-*/.env.local, kai-delivery/.env.local, services/kai-mail/.env
```

**Editar desarrollo:** cambia la matriz (`shared.env.example` o copia local `shared.env`) y regenera con `npm run env:dev`.

Opcional: `cp envs/shared.env.example envs/shared.env` para overrides locales (gitignored).

## Manifiesto de deploy (matriz)

| Variable | Ejemplo | Efecto |
|----------|---------|--------|
| `KAI_PRODUCT` | `kaistore` \| `kaifood` \| `kaiservices` | Marca / `NEXT_PUBLIC_APP_NAME` |
| `KAI_DEPLOY_PROFILE` | `lite` \| `eshop` \| `retail-full` | Fallback si `KAI_DEPLOY_APPS` vacío |
| `KAI_FEATURE_ESHOP` | `true` / `false` | → `NEXT_PUBLIC_ESHOP_ENABLED` (admin) |
| `KAI_FEATURE_JEWELRY` | `true` / `false` | → `NEXT_PUBLIC_JEWELRY_ENABLED` (metales, calculadora) |
| `KAI_FEATURE_MULTI_COMPANY` | `true` / `false` | → menú Empresas (SUPER_ADMIN) |
| `KAI_DEPLOY_APPS` | `backend,admin,pos,stock,eshop,delivery,mail` | `scripts/dev-apps.sh` levanta solo esas apps |

Perfiles listos en `envs/profiles/*.env.example` (copiar líneas a `shared.env`):

| Perfil | Uso |
|--------|-----|
| `profiles/joyarte.env.example` | Joyería + eShop |
| `profiles/san-sebastian.env.example` | Super, sin eShop ni joyería |
| `profiles/demo.env.example` | Mi Empresa multi-empresa, sin joyería |

Desarrollo San Sebastián: `npm run setup:san-sebastian` (seed + `shared.env`) y `npm run dev:san-sebastian`.

## Uso rápido

```bash
npm run env:dev              # regenera .env de cada app (manual)
npm run dev:all              # env:dev automático + infra + apps
npm run dev                  # lite; sin sync (npm run env:dev si falta .env)
```

## Puertos por app

| App          | Puerto | Fragmento                         | Destino                        |
|--------------|--------|-----------------------------------|--------------------------------|
| Backend      | 5030   | `backend.env.example`             | `backend/.env`                 |
| pwa-admin    | 5031   | `pwa-admin.env.local.example`     | `pwa-admin/.env.local`         |
| pwa-pos      | 5032   | `pwa-pos.env.local.example`       | `pwa-pos/.env.local`           |
| pwa-stock    | 5033   | `pwa-stock.env.local.example`     | `pwa-stock/.env.local`         |
| pwa-eshop    | 5034   | `pwa-eshop.env.local.example`     | `pwa-eshop/.env.local`         |
| kai-delivery | 5035   | `kai-delivery.env.local.example`  | `kai-delivery/.env.local`      |
| kai-mail     | 5040   | `kai-mail.env.example`            | `services/kai-mail/.env`       |

## Notas

- Deploy (env) vs tenant (BD): `KAI_FEATURE_ESHOP` habilita el módulo en la instancia; `company.settings.eShopEnabled` activa eShop por empresa.
- Tras `seed:*`, actualiza UUID/slug en la matriz.
- `CORS_ORIGIN` se genera en sync desde puertos PWA.
- LAN: cambia `KAI_DEV_HOST` y `npm run env:dev`.
