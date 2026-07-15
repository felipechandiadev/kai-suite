#!/usr/bin/env bash
# Prepara datos OSRM (Maule/Parral) y deja listo: docker compose --profile osrm up -d osrm
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$ROOT/osrm-data"
OSRM_IMAGE="ghcr.io/project-osrm/osrm-backend:latest"
CHILE_PBF="$DATA/chile-latest.osm.pbf"
REGION_PBF="$DATA/maule-parral.osm.pbf"
REGION_BASE="$DATA/maule-parral"

mkdir -p "$DATA"

if [[ ! -f "$CHILE_PBF" ]]; then
  echo "→ Descargando extracto Chile (~65 MB, una sola vez)…"
  curl -fsSL -o "$CHILE_PBF" https://download.geofabrik.de/south-america/chile-latest.osm.pbf
fi

if [[ ! -f "$REGION_PBF" ]]; then
  echo "→ Recortando bbox Parral/Maule…"
  docker run --rm -v "$DATA:/data" "$OSRM_IMAGE" \
    sh -c "apt-get update -qq && apt-get install -y -qq osmium-tool >/dev/null && osmium extract --bbox -72.05,-36.35,-71.55,-36.00 /data/chile-latest.osm.pbf -o /data/maule-parral.osm.pbf -O"
fi

if [[ ! -f "${REGION_BASE}.osrm" ]]; then
  echo "→ osrm-extract…"
  docker run --rm -t -v "$DATA:/data" "$OSRM_IMAGE" \
    osrm-extract -p /opt/car.lua "/data/maule-parral.osm.pbf"
  echo "→ osrm-partition…"
  docker run --rm -t -v "$DATA:/data" "$OSRM_IMAGE" \
    osrm-partition "/data/maule-parral.osrm"
  echo "→ osrm-customize…"
  docker run --rm -t -v "$DATA:/data" "$OSRM_IMAGE" \
    osrm-customize "/data/maule-parral.osrm"
fi

echo "✅ Datos OSRM listos en $DATA"
echo "   Levantar servicio: cd backend && docker compose --profile osrm up -d osrm"
echo "   URL Kai: http://localhost:5001"
