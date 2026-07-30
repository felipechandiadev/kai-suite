# Kai OSRM — sidecar de ruteo

Motor [OSRM](https://project-osrm.org/) (`osrm-backend`) para optimización de rutas de reparto. **No** es un servicio Nest: Kai Core lo consume por HTTP (`OsrmHttpClient` en `kai-core/src/modules/routing/`).

## Stack

- Imagen `ghcr.io/project-osrm/osrm-backend:latest`
- Datos de mapa en `data/` (generados por bootstrap; no versionados)
- Puerto **5001** → contenedor **5000**

## Primera vez (bootstrap)

Descarga el extracto Chile, recorta bbox Maule/Parral y prepara el grafo MLD (~varios minutos):

```bash
./services/kai-osrm/scripts/osrm-bootstrap.sh
```

Si ya tenías datos en `kai-core/osrm-data/`:

```bash
cp -a kai-core/osrm-data/. services/kai-osrm/data/
```

## Levantar

Desde la raíz del monorepo:

```bash
docker compose -f services/kai-osrm/docker-compose.osrm.yml up -d
```

Detener:

```bash
docker compose -f services/kai-osrm/docker-compose.osrm.yml down
```

Smoke (debe responder JSON):

```bash
curl -s 'http://localhost:5001/health' || curl -s 'http://localhost:5001/route/v1/driving/-71.8,-36.1;-71.7,-36.1?overview=false'
```

## Integración Kai Core

Variable en `envs/shared.env.example` → `kai-core/.env`:

```
OSRM_URL=http://localhost:5001
```

Opcional por bodega en admin (`delivery_settings.osrm_url`). Si OSRM no responde, Core usa fallback (vecino más cercano / línea recta).

## Otros mapas

Editar bbox y nombres de archivo en `scripts/osrm-bootstrap.sh` (Geofabrik + `osmium extract` + pipeline `osrm-extract` / `partition` / `customize`). Ajustar `command` en `docker-compose.osrm.yml` al `.osrm` resultante.

## Deploy

- **Local / demo:** mismo host que el backend; `OSRM_URL=http://localhost:5001`.
- **VPS compartido:** ver `kai-deployments/global-services/osrm/` (stub ops; datos y bootstrap siguen en este folder del monorepo).
