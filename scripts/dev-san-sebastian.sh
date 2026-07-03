#!/usr/bin/env bash
# Dev local — perfil Supermercado San Sebastián (backend + admin + pos).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -f "$ROOT/envs/shared.env" ]]; then
  echo "Falta envs/shared.env. Ejecute primero:" >&2
  echo "  SAN_SEBASTIAN_SII_PFX_PASSWORD=*** bash scripts/setup-san-sebastian-dev.sh" >&2
  exit 1
fi

bash "$ROOT/scripts/dev-infra.sh"

echo ""
echo "==> Sincronizando .env (envs/shared.env → cada app)"
bash "$ROOT/envs/sync-dev-envs.sh" --force
echo ""

exec bash "$ROOT/scripts/dev-apps.sh" lite
