# Seed Barco

Perfil mínimo KaiStore: catálogo desde el PDV Firebird de Barco.

```bash
# Desde la raíz del monorepo (kai-core/.env → DB del tenant)
npm run seed:barco
```

Datos: `data/catalog.json` (generado desde `kai-deployments/tenants/barco`).

Regen:

```bash
cd ../kai-deployments/tenants/barco
python3 seed/generate_catalog.py
```
