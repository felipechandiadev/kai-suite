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
| `seed:demo` | Mi Empresa | `admin` / `098098` | (según config demo) | Desarrollo genérico, multimedia local |
| `seed:joyarte` | Joyarte SpA | `admin` / `098098` | `joyarte` | Tema jewelry, catálogo joyería |
| `seed:san-sebastian` | Supermercado San Sebastián | `admin-ss` / `098098` | — | eShop OFF, catálogo supermercado |

Credenciales configurables: `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_EMAIL`.

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
├── demo/             # Perfil Mi Empresa (+ assets/)
├── joyarte/          # Perfil joyería (+ import Baron)
└── san-sebastian/    # Perfil supermercado (+ import sami6)
```

Ver también [`joyarte/README.md`](./joyarte/README.md).
