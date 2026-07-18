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
npm run seed:demo:no-images --prefix seeds
npm run seed:joyarte --prefix seeds
npm run seed:san-sebastian --prefix seeds
```

O desde `seeds/`:

```bash
npm run seed:demo
npm run seed:demo:no-images
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
| `seed:demo` | Kai Suite | `admin` / `098098` | `demo` | Desarrollo genérico, multimedia, calendario reparto/retiro jul–ago 2026 |
| `seed:demo:no-images` | Kai Suite | idem | `demo` | Igual que `seed:demo` sin logo/catálogo/hero/testimonials (`SEED_SKIP_IMAGES=true`) |
| `seed:joyarte` | Joyarte SpA | `admin` / `098098` | `joyarte` | Tema jewelry, catálogo joyería |
| `seed:san-sebastian` | Supermercado San Sebastián | `admin` / `098098` | — | eShop OFF, catálogo supermercado, **SII producción** |

Credenciales configurables: `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_EMAIL`.

### Multimedia / storage

Con `STORAGE_STRATEGY=local`, cada seed vacía `backend/public/` antes de cargar datos.

Con `STORAGE_STRATEGY=cloudflare` (R2):

- Por defecto **no** vacía el bucket (pueden quedar objetos huérfanos).
- Wipe explícito: `SEED_WIPE_R2=true` (solo buckets allowlisted: `kai-demo`, `*-demo`, `demo-*`, o nombres en `SEED_R2_WIPE_ALLOWLIST`).
- Omitir imágenes: `SEED_SKIP_IMAGES=true` o `npm run seed:demo:no-images`.

```bash
# Seed rápido sin subir a R2
npm run seed:demo:no-images

# Vaciar bucket demo y reseedar con imágenes
SEED_WIPE_R2=true npm run seed:demo
```

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

Con `STORAGE_STRATEGY=local`, demo/joyarte/san-sebastian limpian `backend/public/` antes del seed. Con R2, ver sección Multimedia / storage arriba.

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
