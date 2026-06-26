#!/usr/bin/env bash
# Copia plantillas de envs/ hacia cada app.
# Por defecto NO sobrescribe archivos que ya existen (evita alertas de Cursor y pérdida de cambios).
#
# Uso:
#   ./envs/sync-dev-envs.sh           # solo crea .env faltantes
#   ./envs/sync-dev-envs.sh --force   # sobrescribe todo (npm run env:dev)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENVS="$(cd "$(dirname "$0")" && pwd)"

FORCE=false
for arg in "$@"; do
  case "$arg" in
    --force|-f) FORCE=true ;;
    --help|-h)
      echo "Uso: $0 [--force]"
      echo "  (sin flags)  copia solo si el destino no existe"
      echo "  --force      sobrescribe todos los .env de desarrollo"
      exit 0
      ;;
  esac
done

copy_env() {
  local src="$1"
  local dest="$2"
  if [[ ! -f "$src" ]]; then
    echo "[sync-dev-envs] omitido (sin plantilla): $src" >&2
    return 0
  fi
  if [[ "$FORCE" == true ]]; then
    cp "$src" "$dest"
    echo "[sync-dev-envs] actualizado: $dest"
  elif [[ -f "$dest" ]]; then
    echo "[sync-dev-envs] conservado (ya existe): $dest"
  else
    cp "$src" "$dest"
    echo "[sync-dev-envs] creado: $dest"
  fi
}

copy_env "$ENVS/backend.env" "$ROOT/backend/.env"
copy_env "$ENVS/pwa-admin.env.local" "$ROOT/pwa-admin/.env.local"
copy_env "$ENVS/pwa-pos.env.local" "$ROOT/pwa-pos/.env.local"
copy_env "$ENVS/pwa-eshop.env.local" "$ROOT/pwa-eshop/.env.local"
copy_env "$ENVS/pwa-stock.env.local" "$ROOT/pwa-stock/.env.local"
copy_env "$ENVS/kai-mail.env" "$ROOT/services/kai-mail/.env"

# Obsoleto: un solo .env.local en eShop (antes se generaba .env.development.local).
if [[ -f "$ROOT/pwa-eshop/.env.development.local" ]]; then
  rm "$ROOT/pwa-eshop/.env.development.local"
  echo "[sync-dev-envs] eliminado (obsoleto): pwa-eshop/.env.development.local"
fi

echo ""
if [[ "$FORCE" == true ]]; then
  echo "[sync-dev-envs] Desarrollo 503x aplicado (forzado):"
else
  echo "[sync-dev-envs] Desarrollo 503x — solo archivos nuevos:"
fi
echo "  backend/.env              PORT=5030"
echo "  pwa-admin/.env.local      :5031"
echo "  pwa-pos/.env.local        :5032"
echo "  pwa-stock/.env.local      :5033"
echo "  pwa-eshop/.env.local      :5034"
echo "  services/kai-mail/.env    :5040"
