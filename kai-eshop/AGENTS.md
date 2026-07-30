# kai-eshop — Guía para agentes

- **Una tienda por deploy** (como POS): rutas en `/`, sin slug en URL.
- Slug de tienda: `NEXT_PUBLIC_ESHOP_STORE_SLUG` en `.env.local` → header `X-EShop-Store-Slug` al API.
- Patrón: UI → Server Actions → `*.request.ts` → `/api/e-shop/...`
- **Prohibido** `fetch` al backend desde componentes cliente (excepto casos documentados).
- Hero: **hardcodeado** en `src/features/e-shop-storefront/constants/hero.ts` — no API ni BD.
- Reutilizar UI: `import { Button, IconButton, TextField } from "@kai/ui"`.
- UX obligatoria: ver `docs/legacy/KAISTORE_E-SHOP_DEVELOPMENT_GUIDE.md` §7.0.
