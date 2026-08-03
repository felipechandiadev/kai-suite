# Seed Barco (dual)

El Barco (`kaistore`) + Ohlala (`kaifood`) en la misma DB.

```bash
# Desde la raíz del monorepo (kai-core/.env → DB del tenant)
npm run seed:barco
```

Datos:

- `data/catalog-store.json` — El Barco
- `data/catalog-food.json` — Ohlala

Regen:

```bash
cd ../kai-deployments/tenants/barco
python3 seed/generate_catalog.py --all
```

Usuarios seed (password `098098`): `superadmin`, `admin`, `operador`, `mesero`.
