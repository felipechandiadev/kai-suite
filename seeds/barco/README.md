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
- Nombres: se quita el sufijo `(EAN)` cuando coincide con barcode/sku; si quedan colisiones de nombre, se desambigua con `(barcode|sku)`
- Excel cliente: `npm run export:barco-catalog --prefix seeds` → `exports/catalogo-barco-cliente.xlsx`

```bash
cd ../kai-deployments/tenants/barco
python3 seed/generate_catalog.py --all
```

## Excel para el cliente (catálogo limpio por sucursal)

Genera un XLSX con **una hoja por base PDV** (mismas columnas de limpieza: tipo sugerido, cocina, precios):

| Hoja | Fuente |
|------|--------|
| `Ohlala` | `catalog-food.json` ← `exports/PDVDATA` |
| `El_Barco` | `catalog-store.json` ← `exports/PDVDATA-barco` |

```bash
# Desde la raíz del monorepo
npm run export:barco-catalog --prefix seeds
# → seeds/barco/exports/catalogo-barco-cliente.xlsx
```

Hojas: `Instrucciones`, `Ohlala`, `El_Barco`.

Tras la revisión del cliente, para Admin → Catálogo → Carga masiva: copiar/renombrar una hoja a `Productos` (el import busca esa hoja; columnas `tipo_producto` + `cocina`).

Usuarios seed (password `098098`): `superadmin`, `admin`, `operador`, `mesero`.
