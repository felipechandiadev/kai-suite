# Seed Barco (Ohlala unificado)

Una empresa **Ohlala** (`kaifood`) con dos sucursales: **Ohlala** (HQ, dining + Cocina) y **El Barco** (POS retail).

```bash
# Desde la raíz del monorepo (kai-core/.env → DB del tenant)
npm run seed:barco
```

**Importante:** si la DB venía del seed dual (El Barco kaistore + Ohlala), recreá la DB o wipe antes de reseedar. Este seed no migra in-place.

## Datos

- `data/catalog-food.json` + `data/catalog-store.json` — fuentes PDV
- Merge en runtime (`loadUnifiedBarcoCatalog`): food gana en choques (barcode → nombre); SKUs únicos; **sin control de stock**

Regen de fuentes:

```bash
cd ../kai-deployments/tenants/barco
python3 seed/generate_catalog.py --all
```

Usuarios seed (password `098098`): `superadmin`, `admin`, `operador`, `mesero`.
