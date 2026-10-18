# deploy/

Helpers de infra del monorepo **kai-suite** (no es el inventario por cliente).

| Archivo | Uso |
|---------|-----|
| `vps-git-setup.sh` | Bootstrap Git/SSH + clone en el VPS |
| `ports.demo.env.example` | Puertos/dominios del ambiente demo |
| `kai-printers-downloads.md` | Publicar binarios Kai Printers al VPS |
| `../scripts/prod-build-tenant.sh` | Build de producción (artefactos) con `KAI_ENV_MATRIX` ya proyectado |

## Config por tenant

Orquestación por instancia (`tenants/barco`, `tenants/kai-suite-demo`, …) vive en el repo hermano:

**[kai-deployments](https://github.com/felipechandiadev/kai-deployments)** → `../kai-deployments` en disco (`_shared/` + `tenants/`).

Runbook de publicación (PM2, migraciones, Caddy): **[kai-deployments/docs/DEPLOY-RUNBOOK.md](https://github.com/felipechandiadev/kai-deployments/blob/main/docs/DEPLOY-RUNBOOK.md)**.

Abrí [`kai-platform.code-workspace`](../kai-platform.code-workspace) en Cursor para ver **kai-suite** + **kai-deployments** en la misma ventana.

## Build en el VPS (invocado por el runner)

Con el `.env` del tenant ya sincronizado en el monorepo:

```sh
export KAI_ENV_MATRIX=/ruta/kai-deployments/tenants/<id>/.env
./scripts/prod-build-tenant.sh
```

No levanta procesos; solo `npm ci` y builds (`kai-core`, PWAs, mail, landing según `KAI_DEPLOY_APPS`).
