#!/usr/bin/env bash
# Proyecta envs/shared.env (+ fragmento por app) hacia cada .env de desarrollo.
#
# Matriz: KAI_ENV_MATRIX (archivo absoluto) | envs/shared.env | envs/shared.env.example
# Fragmentos: envs/<app>.env.example y kai-*.env.local.example (versionados)
#
# Uso:
#   ./envs/sync-dev-envs.sh           # solo crea destinos faltantes
#   ./envs/sync-dev-envs.sh --force   # regenera todo (npm run env:dev)
#   KAI_ENV_MATRIX=/path/to/tenant.env ./envs/sync-dev-envs.sh --force
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENVS="$(cd "$(dirname "$0")" && pwd)"

FORCE=false
for arg in "$@"; do
  case "$arg" in
    --force|-f) FORCE=true ;;
    --help|-h)
      echo "Uso: $0 [--force]"
      echo "  Matriz:        KAI_ENV_MATRIX=... | envs/shared.env | shared.env.example"
      echo "  Fragmentos:    envs/*.env.example, envs/*.env.local.example"
      echo "  (sin flags)    genera solo si el destino no existe"
      echo "  --force        regenera todos los .env de desarrollo"
      exit 0
      ;;
  esac
done

resolve_template() {
  local base="$1"
  if [[ -f "$ENVS/${base}.example" ]]; then
    echo "$ENVS/${base}.example"
  else
    echo "[sync-dev-envs] omitido (falta fragmento): ${base}.example" >&2
    return 1
  fi
}

resolve_shared() {
  if [[ -n "${KAI_ENV_MATRIX:-}" ]]; then
    if [[ -f "$KAI_ENV_MATRIX" ]]; then
      echo "$KAI_ENV_MATRIX"
      return 0
    fi
    echo "[sync-dev-envs] error: KAI_ENV_MATRIX no existe: $KAI_ENV_MATRIX" >&2
    exit 1
  fi
  if [[ -f "$ENVS/shared.env" ]]; then
    echo "$ENVS/shared.env"
  elif [[ -f "$ENVS/shared.env.example" ]]; then
    echo "$ENVS/shared.env.example"
  else
    echo "[sync-dev-envs] error: falta envs/shared.env.example" >&2
    exit 1
  fi
}

shared_get() {
  local file="$1"
  local key="$2"
  grep -E "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2- || true
}

kai_product_label() {
  case "$(echo "${1:-kaistore}" | tr '[:upper:]' '[:lower:]')" in
    kaifood) echo "KaiFood" ;;
    kaiservices) echo "Kai Services" ;;
    kaisuite) echo "Kai Suite" ;;
    *) echo "KaiStore" ;;
  esac
}

feature_to_next_public() {
  local file="$1"
  local next_key="$2"
  local raw="$3"
  local default_val="${4:-false}"
  if [[ -z "$raw" ]]; then
    set_kv "$file" "$next_key" "$default_val"
  else
    set_kv "$file" "$next_key" "$raw"
  fi
}

apply_platform_flags() {
  local file="$1"
  local shared="$2"
  local app_suffix="$3"

  local product label
  product="$(shared_get "$shared" KAI_PRODUCT)"
  product="${product:-kaistore}"
  label="$(kai_product_label "$product")"

  feature_to_next_public "$file" "NEXT_PUBLIC_ESHOP_ENABLED" \
    "$(shared_get "$shared" KAI_FEATURE_ESHOP)" "true"
  feature_to_next_public "$file" "NEXT_PUBLIC_JEWELRY_ENABLED" \
    "$(shared_get "$shared" KAI_FEATURE_JEWELRY)" "false"
  feature_to_next_public "$file" "NEXT_PUBLIC_MULTI_COMPANY_ENABLED" \
    "$(shared_get "$shared" KAI_FEATURE_MULTI_COMPANY)" "false"
  set_kv "$file" "NEXT_PUBLIC_KAI_PRODUCT" "$product"
  if [[ -n "$app_suffix" ]]; then
    set_kv "$file" "NEXT_PUBLIC_APP_NAME" "${label} ${app_suffix}"
  fi
}

# Fusiona shared + fragmento (fragmento gana). Conserva comentarios del fragmento.
merge_env_files() {
  local shared="$1"
  local fragment="$2"
  local dest="$3"

  awk -v shared="$shared" -v fragment="$fragment" '
    function load(path, arr,    line, key, pos) {
      while ((getline line < path) > 0) {
        if (line ~ /^[ \t]*#/) continue
        if (line ~ /^[ \t]*$/) continue
        if (line ~ /^[A-Za-z_][A-Za-z0-9_]*=/) {
          pos = index(line, "=")
          key = substr(line, 1, pos - 1)
          arr[key] = substr(line, pos + 1)
        }
      }
      close(path)
    }
    BEGIN {
      load(shared, base)
      load(fragment, frag)
      for (k in base) {
        if (!(k in frag)) frag[k] = base[k]
        else if (frag[k] == "") frag[k] = base[k]
      }

      print "# Generado por envs/sync-dev-envs.sh"
      print "# Editar matriz: envs/shared.env | fragmentos: envs/*.example"
      print ""

      while ((getline line < fragment) > 0) {
        if (line ~ /^[A-Za-z_][A-Za-z0-9_]*=/) {
          pos = index(line, "=")
          key = substr(line, 1, pos - 1)
          print key "=" frag[key]
        } else {
          print line
        }
      }
      close(fragment)
    }
  ' > "$dest"
}

set_kv() {
  local file="$1"
  local key="$2"
  local val="$3"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    # ENV + \Q evita romper el s/// con URLs (http://) u otros metacaracteres.
    PERL_KEY="$key" PERL_VAL="$val" perl -i -pe \
      's/^\Q$ENV{PERL_KEY}\E=.*/$ENV{PERL_KEY}=$ENV{PERL_VAL}/' "$file" 2>/dev/null || \
      sed -i '' "s|^${key}=.*|${key}=${val}|" "$file"
  else
    printf '%s=%s\n' "$key" "$val" >> "$file"
  fi
  return 0
}

apply_backend_derived() {
  local file="$1"
  local shared="$2"

  local host backend_port mail_port voice_port backend_url
  host="$(shared_get "$shared" KAI_DEV_HOST)"
  host="${host:-localhost}"
  backend_port="$(shared_get "$shared" KAI_BACKEND_PORT)"
  backend_port="${backend_port:-5060}"
  mail_port="$(shared_get "$shared" KAI_MAIL_PORT)"
  mail_port="${mail_port:-5040}"
  voice_port="$(shared_get "$shared" KAI_VOICE_PORT)"
  voice_port="${voice_port:-5041}"
  backend_url="$(shared_get "$shared" KAI_BACKEND_URL)"
  backend_url="${backend_url:-http://${host}:${backend_port}}"

  set_kv "$file" "PORT" "$backend_port"
  set_kv "$file" "BACKEND_API_URL" "$backend_url"
  set_kv "$file" "KAI_MAIL_URL" "http://${host}:${mail_port}"
  set_kv "$file" "KAI_VOICE_URL" "http://${host}:${voice_port}"
  set_kv "$file" "LIRA_VOICE_URL" "http://${host}:${voice_port}"

  local product
  product="$(shared_get "$shared" KAI_PRODUCT)"
  product="${product:-kaistore}"
  set_kv "$file" "KAI_PRODUCT" "$product"

  local cors="" port
  for port in \
    "$(shared_get "$shared" KAI_ADMIN_PORT)" \
    "$(shared_get "$shared" KAI_POS_PORT)" \
    "$(shared_get "$shared" KAI_STOCK_PORT)" \
    "$(shared_get "$shared" KAI_ESHOP_PORT)" \
    "$(shared_get "$shared" KAI_DELIVERY_PORT)" \
    "$(shared_get "$shared" KAI_WAITER_PORT)" \
    "$(shared_get "$shared" KAI_KDS_PORT)" \
    "$(shared_get "$shared" KAI_BOARD_PORT)"; do
    [[ -z "$port" ]] && continue
    [[ -n "$cors" ]] && cors+=","
    cors+="http://${host}:${port},http://127.0.0.1:${port}"
  done
  set_kv "$file" "CORS_ORIGIN" "$cors"

  local fiscal_key
  fiscal_key="$(shared_get "$shared" FISCAL_ENCRYPTION_KEY)"
  if [[ -n "$fiscal_key" ]]; then
    set_kv "$file" "FISCAL_ENCRYPTION_KEY" "$fiscal_key"
  fi
}

apply_pwa_projection() {
  local file="$1"
  local shared="$2"
  local auth_secret_key="$3"
  local auth_url_key="$4"
  shift 4

  local secret url backend_url val pair from to host port
  host="$(shared_get "$shared" KAI_DEV_HOST)"
  host="${host:-localhost}"
  secret="$(shared_get "$shared" "$auth_secret_key")"
  url="$(shared_get "$shared" "$auth_url_key")"
  if [[ -z "$url" ]]; then
    case "$auth_url_key" in
      ADMIN_NEXTAUTH_URL) port="$(shared_get "$shared" KAI_ADMIN_PORT)"; port="${port:-5071}" ;;
      POS_NEXTAUTH_URL) port="$(shared_get "$shared" KAI_POS_PORT)"; port="${port:-5062}" ;;
      STOCK_NEXTAUTH_URL) port="$(shared_get "$shared" KAI_STOCK_PORT)"; port="${port:-5063}" ;;
      *) port="" ;;
    esac
    [[ -n "$port" ]] && url="http://${host}:${port}"
  fi
  [[ -n "$secret" ]] && set_kv "$file" "NEXTAUTH_SECRET" "$secret"
  [[ -n "$url" ]] && set_kv "$file" "NEXTAUTH_URL" "$url"

  for pair in "$@"; do
    from="${pair%%:*}"
    to="${pair##*:}"
    val="$(shared_get "$shared" "$from")"
    [[ -n "$val" ]] && set_kv "$file" "$to" "$val"
  done

  backend_url="$(shared_get "$shared" KAI_BACKEND_URL)"
  [[ -n "$backend_url" ]] && set_kv "$file" "BACKEND_API_URL" "$backend_url"
  [[ -n "$backend_url" ]] && set_kv "$file" "NEXT_PUBLIC_BACKEND_API_URL" "$backend_url"
  set_kv "$file" "NODE_ENV" "development"
}

apply_eshop_projection() {
  local file="$1"
  local shared="$2"
  local backend_url slug site

  backend_url="$(shared_get "$shared" KAI_BACKEND_URL)"
  slug="$(shared_get "$shared" NEXT_PUBLIC_ESHOP_STORE_SLUG)"
  site="$(shared_get "$shared" NEXT_PUBLIC_ESHOP_SITE_URL)"

  # if/fi (no `[[ ]] &&`): en bash 3.2 + set -e, un && vacío al final de la
  # función aborta todo el script (p. ej. food con eshop:null sin slug/site).
  if [[ -n "$backend_url" ]]; then
    set_kv "$file" "BACKEND_API_URL" "$backend_url"
    set_kv "$file" "NEXT_PUBLIC_BACKEND_API_URL" "$backend_url"
  fi
  if [[ -n "$slug" ]]; then
    set_kv "$file" "NEXT_PUBLIC_ESHOP_STORE_SLUG" "$slug"
  fi
  if [[ -n "$site" ]]; then
    set_kv "$file" "NEXT_PUBLIC_ESHOP_SITE_URL" "$site"
  fi
  return 0
}

write_env() {
  local fragment_base="$1"
  local dest="$2"
  local profile="$3"

  local shared fragment backend_url
  shared="$(resolve_shared)"
  fragment="$(resolve_template "$fragment_base")" || return 0

  if [[ "$FORCE" != true && -f "$dest" ]]; then
    echo "[sync-dev-envs] conservado (ya existe): $dest"
    return 0
  fi

  mkdir -p "$(dirname "$dest")"
  merge_env_files "$shared" "$fragment" "$dest"

  case "$profile" in
    backend) apply_backend_derived "$dest" "$shared" ;;
    admin)
      apply_pwa_projection "$dest" "$shared" ADMIN_NEXTAUTH_SECRET ADMIN_NEXTAUTH_URL
      apply_platform_flags "$dest" "$shared" "Admin"
      ;;
    pos)
      apply_pwa_projection "$dest" "$shared" POS_NEXTAUTH_SECRET POS_NEXTAUTH_URL \
        "NEXT_PUBLIC_COMPANY_ID_POS:NEXT_PUBLIC_COMPANY_ID"
      apply_platform_flags "$dest" "$shared" "POS"
      ;;
    stock)
      apply_pwa_projection "$dest" "$shared" STOCK_NEXTAUTH_SECRET STOCK_NEXTAUTH_URL \
        "NEXT_PUBLIC_COMPANY_ID_STOCK:NEXT_PUBLIC_COMPANY_ID"
      apply_platform_flags "$dest" "$shared" "StockControl"
      ;;
    eshop)
      apply_eshop_projection "$dest" "$shared"
      apply_platform_flags "$dest" "$shared" "e-Shop"
      ;;
    delivery)
      backend_url="$(shared_get "$shared" KAI_BACKEND_URL)"
      [[ -n "$backend_url" ]] && set_kv "$dest" "BACKEND_API_URL" "$backend_url"
      [[ -n "$backend_url" ]] && set_kv "$dest" "NEXT_PUBLIC_BACKEND_API_URL" "$backend_url"
      set_kv "$dest" "NODE_ENV" "development"
      ;;
    waiter|kds|board)
      backend_url="$(shared_get "$shared" KAI_BACKEND_URL)"
      [[ -n "$backend_url" ]] && set_kv "$dest" "BACKEND_API_URL" "$backend_url"
      [[ -n "$backend_url" ]] && set_kv "$dest" "NEXT_PUBLIC_BACKEND_API_URL" "$backend_url"
      set_kv "$dest" "NODE_ENV" "development"
      if [[ "$profile" == "waiter" ]]; then
        apply_platform_flags "$dest" "$shared" "Waiter"
      elif [[ "$profile" == "kds" ]]; then
        apply_platform_flags "$dest" "$shared" "KDS"
      else
        apply_platform_flags "$dest" "$shared" "Board"
      fi
      ;;
    mail) ;;
  esac

  echo "[sync-dev-envs] generado: $dest"
}

SHARED="$(resolve_shared)"

write_env "kai-core.env" "$ROOT/kai-core/.env" backend
write_env "kai-admin.env.local" "$ROOT/kai-admin/.env.local" admin
write_env "kai-pos.env.local" "$ROOT/kai-pos/.env.local" pos
write_env "kai-stock.env.local" "$ROOT/kai-stock/.env.local" stock
write_env "kai-eshop.env.local" "$ROOT/kai-eshop/.env.local" eshop
write_env "kai-delivery.env.local" "$ROOT/kai-delivery/.env.local" delivery
write_env "kai-waiter.env.local" "$ROOT/kai-waiter/.env.local" waiter
write_env "kai-kds.env.local" "$ROOT/kai-kds/.env.local" kds
write_env "kai-board.env.local" "$ROOT/kai-board/.env.local" board
write_env "kai-mail.env" "$ROOT/services/kai-mail/.env" mail

# Claves de shared que pueden faltar en .env generados antes de añadirlas a la matriz
patch_backend_fiscal_key() {
  local dest="$ROOT/kai-core/.env"
  [[ -f "$dest" ]] || return 0
  if grep -q "^FISCAL_ENCRYPTION_KEY=" "$dest" 2>/dev/null; then
    return 0
  fi
  local fiscal_key
  fiscal_key="$(shared_get "$SHARED" FISCAL_ENCRYPTION_KEY)"
  if [[ -n "$fiscal_key" ]]; then
    set_kv "$dest" "FISCAL_ENCRYPTION_KEY" "$fiscal_key"
    echo "[sync-dev-envs] añadido FISCAL_ENCRYPTION_KEY → kai-core/.env"
  fi
}
patch_backend_fiscal_key

if [[ -f "$ROOT/kai-eshop/.env.development.local" ]]; then
  rm "$ROOT/kai-eshop/.env.development.local"
  echo "[sync-dev-envs] eliminado (obsoleto): kai-eshop/.env.development.local"
fi

echo ""
echo "[sync-dev-envs] Matriz: $SHARED"
if [[ "$FORCE" == true ]]; then
  echo "[sync-dev-envs] Regenerado (forzado)"
else
  echo "[sync-dev-envs] Solo archivos nuevos"
fi
echo "  kai-core/.env              ← shared + backend.env"
echo "  kai-admin/.env.local      ← shared + kai-admin.env.local"
echo "  kai-pos/.env.local        ← shared + kai-pos.env.local"
echo "  kai-stock/.env.local      ← shared + kai-stock.env.local"
echo "  kai-eshop/.env.local      ← shared + kai-eshop.env.local"
echo "  kai-delivery/.env.local   ← shared + kai-delivery.env.local"
echo "  kai-waiter/.env.local     ← shared + kai-waiter.env.local"
echo "  kai-kds/.env.local        ← shared + kai-kds.env.local"
echo "  kai-board/.env.local      ← shared + kai-board.env.local"
echo "  services/kai-mail/.env    ← shared + kai-mail.env"
