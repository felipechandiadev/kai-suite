# Kai Platform

Monorepo de la **plataforma Kai**: backend compartido y aplicaciones por vertical de producto (**KaiStore**, **KaiFood**, componentes transversales Kai Printers / Kai Screen / Kai Scale).

## Descripción

- **Backend**: NestJS, TypeScript, CQRS/DDD, TypeORM, PostgreSQL.
- **Frontends**: Next.js 16, React 19, Server Actions, NextAuth, PWA.

## Estructura del proyecto

```
kai/
├── backend/                    # API compartida (KaiStore, KaiFood, …)
├── pwa-admin/                  # Admin web
├── pwa-pos/                    # POS
├── pwa-stock/                  # Inventario móvil
├── pwa-eshop/                  # Tienda pública
├── kai-printers-android/       # Agente Kai Printers (Android)
├── kai-screen-android/         # Agente Kai Screen (Android)
├── kai-printers-desktop/       # Agente Kai Printers (Tauri, carpeta local)
├── packages/                   # Clientes y utilidades compartidas (@kai/*)
├── assets/brand/               # Marca Kai (SVG, exports)
└── docs/                       # Documentación
```

## Inicio rápido

### Todo el stack (recomendado)

```bash
npm install          # raíz — concurrently
npm run env:dev      # primera vez: crea/sobrescribe .env de desarrollo
npm run dev          # liviano: infra + backend + admin (recomendado)
npm run dev:all      # stack completo (+ pos, stock, eshop, mail)
```

`npm run dev` usa el perfil **liviano** (backend + admin). Para todo el ecosistema: `npm run dev:all`.

| Servicio | URL |
|----------|-----|
| Backend API | http://localhost:5030/api |
| Admin | http://localhost:5031 |
| POS | http://localhost:5032 |
| Stock | http://localhost:5033 |
| eShop | http://localhost:5034 |

Login admin (seed): `admin` / `098098`

### Por app (manual)

1. **Backend**:
   ```bash
   cd backend
   npm install
   npm run start:dev  # Puerto 5030
   ```

2. **Admin**:
   ```bash
   cd pwa-admin
   npm install
   npm run dev  # Puerto 5031
   ```

3. **KaiStore eShop**:
   ```bash
   cd pwa-eshop
   npm install
   npm run dev  # Puerto 5034
   ```

4. **Seed base de datos** (desde `backend/`):
   ```bash
   cd backend
   npm run seed   # Mi Empresa — desarrollo
   ```

## Documentación

- **Migración de nombres (Flow Store → Kai):** `docs/project/MIGRACION-NOMBRES-KAISTORE.md`
- **Arquitectura y ecosistema:** `docs/project/ARQUITECTURA_Y_ECOSISTEMA.md`
- **Módulos backend:** `docs/project/MODULOS_Y_SERVICIOS_BACKEND.md`
- **Índice completo:** `docs/README.md`

## Agentes IA (Cursor)

- **Backend:** `.instructions/backend.instruction` y `pwa-admin/AGENTS.md`
- **Frontend admin:** `.instructions/webadmin.instruction`
- **Reglas monorepo:** `.cursor/rules/kai-platform.mdc`

## Configuración

- Variables de entorno: ver guías en `docs/legacy/`
- Base de datos: PostgreSQL vía `backend/docker-compose.yml`

## Repositorio

```bash
git clone git@github.com:felipechandiadev/kai.git
```

## Contribución

- Usa Git para control de versiones.
- Sigue las instrucciones de agentes para mantener consistencia.
- Commits descriptivos.

## Licencia

Proyecto interno — sin licencia pública.
