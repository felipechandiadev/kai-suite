# Kai Platform

Monorepo de la **plataforma Kai**: backend compartido y aplicaciones por vertical de producto (**KaiStore**, **KaiFood**, componentes transversales Kai Printers / Kai Screen / Kai Scale).

## Descripción

- **Backend**: NestJS, TypeScript, CQRS/DDD, TypeORM, PostgreSQL.
- **Frontends**: Next.js 16, React 19, Server Actions, NextAuth, PWA.

## Estructura del proyecto

```
kai/
├── kai-core/                   # API (Kai Core) compartida (KaiStore, KaiFood, …)
├── kai-admin/                  # Admin web
├── kai-pos/                    # POS
├── kai-stock/                  # Inventario móvil
├── kai-eshop/                  # Tienda pública
├── kai-printers-android/       # Agente Kai Printers (Android)
├── kai-screen-android/         # Agente Kai Screen (Android)
├── kai-printers-desktop/       # Agente Kai Printers (Tauri, carpeta local)
├── packages/                   # Clientes y utilidades compartidas (@kai/*)
├── seeds/                      # Perfiles de seed (demo, joyarte, san-sebastian)
├── assets/brand/               # Marca Kai (SVG, exports)
└── docs/                       # Documentación
```

## Inicio rápido

### Todo el stack (recomendado)

```bash
npm install          # raíz — workspaces: PWAs Next + packages/@kai (+ concurrently)
npm run env:dev      # primera vez: matriz envs/shared.env.example → .env de cada app
npm run dev          # liviano: infra + backend + admin (recomendado)
npm run dev:all      # stack completo (+ pos, stock, eshop, mail)
```

`npm install` en la raíz instala **todas las PWAs** (`kai-admin`, `kai-pos`, `kai-eshop`, `kai-stock`, `kai-waiter`, `kai-kds`, `kai-delivery`) y los paquetes `@kai/*`. Backend, landing, seeds y servicios quedan **fuera** del workspace: `cd … && npm install` por carpeta.

`npm run dev` usa el perfil **liviano** (backend + admin). Para todo el ecosistema: `npm run dev:all`.

| Servicio | URL |
|----------|-----|
| Backend API | http://localhost:5060/api |
| Admin | http://localhost:5071 |
| POS | http://localhost:5062 |
| Stock | http://localhost:5063 |
| eShop | http://localhost:5064 |
| Delivery | http://localhost:5065 |
| Landing | http://localhost:5066 |

Login admin (seed): `admin` / `098098`

### Por app (manual)

1. **Backend** (fuera del workspace front):
   ```bash
   cd kai-core
   npm install
   npm run start:dev  # Puerto 5060
   ```

2. **Admin** (deps ya instaladas con `npm install` en la raíz):
   ```bash
   cd kai-admin
   npm run dev  # Puerto 5071 (5061 bloqueado por Next.js)
   # o: npm run dev -w kai-admin
   ```

3. **KaiStore eShop**:
   ```bash
   cd kai-eshop
   npm run dev  # Puerto 5064
   ```

4. **Seed base de datos** (desde la raíz o `seeds/`):

   ```bash
   npm run seed:demo --prefix seeds   # Mi Empresa — desarrollo
   # npm run seed:joyarte --prefix seeds
   # npm run seed:san-sebastian --prefix seeds
   ```

   Requiere PostgreSQL y `kai-core/.env`. Ver [`seeds/README.md`](seeds/README.md).

## Kai Printers — publicar y deploy (Windows / Android / macOS)

Instaladores servidos en **`/downloads/`** del POS (`Configuración → Impresión local`).

Guía completa: [`kai-pos/public/downloads/README.md`](kai-pos/public/downloads/README.md) · deploy VPS: [`deploy/kai-printers-downloads.md`](deploy/kai-printers-downloads.md)

```bash
# Publicar (requiere kai-printers-desktop/ y/o kai-printers-android/)
npm run kai-printers:publish -- --windows-only --build

# Solo manifests en git; luego rsync binarios al VPS
git add kai-pos/public/downloads/kai-printers-*.manifest.json
git commit -m "chore(printers): actualizar manifests Kai Printers"
```

Versión desktop publicada: **1.0.6** (`kai-printers-windows-1.0.6-x64-portable.zip`).

## Documentación

- **Migración de nombres (Flow Store → Kai):** `docs/project/MIGRACION-NOMBRES-KAISTORE.md`
- **Arquitectura y ecosistema:** `docs/project/ARQUITECTURA_Y_ECOSISTEMA.md`
- **Módulos backend:** `docs/project/MODULOS_Y_SERVICIOS_BACKEND.md`
- **Índice completo:** `docs/README.md`

## Agentes IA (Cursor)

- **Backend:** `.instructions/backend.instruction` y `kai-admin/AGENTS.md`
- **Frontend admin:** `.instructions/webadmin.instruction`
- **Reglas monorepo:** `.cursor/rules/kai-platform.mdc`

## Configuración

- Variables de entorno: ver guías en `docs/legacy/`
- Base de datos: PostgreSQL + PostGIS del **sistema** (`npm run setup:postgres`); Docker opcional (`KAI_DEV_POSTGRES=docker`)

## Repositorio

```bash
git clone git@github.com:felipechandiadev/kai-suite.git
```

## Contribución

- Usa Git para control de versiones.
- Sigue las instrucciones de agentes para mantener consistencia.
- Commits descriptivos.

## Licencia

Proyecto interno — sin licencia pública.
