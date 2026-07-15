# Seeds — perfiles de base de datos

Scripts de seed independientes del backend API. Cada perfil **trunca** la base de datos (`public`) antes de cargar datos, salvo `SEED_SKIP_TRUNCATE=true`.

## Prerrequisitos

- PostgreSQL accesible según `backend/.env`
- `npm install` en `backend/` (ts-node, Nest, TypeORM; los scripts crean un symlink `seeds/node_modules` → `backend/node_modules` en la primera ejecución)
- Variables de entorno leídas desde `backend/.env` vía `AppConfigModule`

## Comandos

Desde la raíz del monorepo:

```bash
npm run seed:demo --prefix seeds
npm run seed:joyarte --prefix seeds
npm run seed:san-sebastian --prefix seeds
```

O desde `seeds/`:

```bash
npm run seed:demo
npm run seed:joyarte
npm run seed:san-sebastian
```

Importadores de catálogo (opcional):

```bash
npm run seed:import-joyarte --prefix seeds
npm run seed:import-san-sebastian --prefix seeds
```

## Perfiles

| Comando | Empresa | Login | eShop slug | Notas |
|---------|---------|-------|------------|-------|
| `seed:demo` | Kai Suite | `admin` / `098098` | `demo` | Desarrollo genérico, multimedia local, calendario reparto/retiro jul–ago 2026 |
| `seed:joyarte` | Joyarte SpA | `admin` / `098098` | `joyarte` | Tema jewelry, catálogo joyería |
| `seed:san-sebastian` | Supermercado San Sebastián | `admin` / `098098` | — | eShop OFF, catálogo supermercado, **SII producción** |

Credenciales configurables: `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_EMAIL`.

## San Sebastián — SII producción

El seed carga emisor, certificado PFX, CAF boleta 39, sub-paquete de folios en `CAJA SAN SEBASTIAN` y habilita boleta en el POS.

### Prerrequisitos fiscales

En `backend/.env`:

- `FISCAL_ENCRYPTION_KEY` (misma key que usa el admin)
- `SAN_SEBASTIAN_SII_PFX_PASSWORD` (contraseña del certificado)

Assets en `seeds/san-sebastian/data/fiscal/` (`certificado.pfx` y `caf-boleta-39.xml` están en `.gitignore`):

```bash
cd backend
npm run fiscal:export-ss-seed   # desde DB ya configurada
npm run seed:san-sebastian --prefix ../seeds
```

Ver [`san-sebastian/data/fiscal/README.md`](./san-sebastian/data/fiscal/README.md).

## Política TRUNCATE

Los tres perfiles llaman `runSeedBootstrapGuards`, que:

1. Aplica parches de esquema si faltan columnas/tablas
2. Ejecuta `TRUNCATE … CASCADE` en todas las tablas de `public` (excepto PostGIS)

Para conservar datos existentes (casos excepcionales):

```bash
SEED_SKIP_TRUNCATE=true npm run seed:demo --prefix seeds
```

Con `STORAGE_STRATEGY=local`, demo/joyarte/san-sebastian limpian `backend/public/` antes del seed para evitar archivos huérfanos de otro perfil.

## Estructura

```
seeds/
├── shared/           # MinimalSeedModule, bootstrap, catálogo, multimedia
├── demo/             # Perfil Kai Suite (+ assets/)
├── joyarte/          # Perfil joyería (+ import Baron)
└── san-sebastian/    # Perfil supermercado (+ import sami6, data/fiscal SII)
```

Ver también [`joyarte/README.md`](./joyarte/README.md).

## San Sebastián — desarrollo local

Perfil dedicado (backend + admin + pos, SII producción en seed):

```bash
# Primera vez o reset completo (seed + sync env)
SAN_SEBASTIAN_SII_PFX_PASSWORD=*** npm run setup:san-sebastian

# Solo levantar apps (usa envs/shared.env)
npm run dev:san-sebastian
```

La contraseña PFX vive en `envs/shared.env` (`SAN_SEBASTIAN_SII_PFX_PASSWORD`). Tras cada seed, `setup:san-sebastian` actualiza `NEXT_PUBLIC_COMPANY_ID_POS` automáticamente.

Login: `admin` / `098098` (admin), `operador` / `098098` (POS).
