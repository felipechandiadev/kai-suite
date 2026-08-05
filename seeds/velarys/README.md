# Seed Velarys (KaiFood)

Perfil mínimo para el tenant **velarys**: empresa, 1 sucursal, tips ON, 3 UPs (Barra / Cocina / Pastelería), catálogo del menú Excel, + socio / CC / proveedor / cliente de prueba.

## Correr

```bash
# Desde el monorepo kai (con kai-core/.env apuntando a la DB del tenant)
npm run seed:velarys

# Desde kai-deployments
./_shared/scripts/seed-tenant.sh velarys
```

Password por defecto: `098098` (`SEED_ADMIN_PASSWORD`).

## Regenerar catálogo desde Excel

```bash
cd seeds/velarys
python3 -m venv .venv && .venv/bin/pip install xlrd
VELARYS_MENU_XLS=~/Downloads/menu-04-08-2026.xls .venv/bin/python scripts/import-menu-xls.py
```

Escribe `data/catalog.json` y lo mirror a `kai-deployments/tenants/velarys/seed/data/catalog.json`.
