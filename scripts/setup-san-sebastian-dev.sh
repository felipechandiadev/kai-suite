#!/usr/bin/env bash
# Configura desarrollo local con seed Supermercado San Sebastián (+ SII producción).
#
# Uso (desde raíz del monorepo):
#   bash scripts/setup-san-sebastian-dev.sh          # seed + sync env
#   bash scripts/setup-san-sebastian-dev.sh --skip-seed   # solo sync env (BD ya seedeada)
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SKIP_SEED=false
for arg in "$@"; do
  case "$arg" in
    --skip-seed) SKIP_SEED=true ;;
  esac
done

SHARED="$ROOT/envs/shared.env"
SHARED_EXAMPLE="$ROOT/envs/shared.env.example"
PROFILE="$ROOT/envs/profiles/san-sebastian.env.example"

if [[ ! -f "$SHARED" ]]; then
  echo "[setup-ss] Creando envs/shared.env desde shared.env.example + perfil San Sebastián"
  cp "$SHARED_EXAMPLE" "$SHARED"
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// /}" ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    if grep -q "^${key}=" "$SHARED" 2>/dev/null; then
      perl -i -pe "s/^\Q${key}\E=.*/${key}=${val}/" "$SHARED" 2>/dev/null || \
        sed -i '' "s|^${key}=.*|${key}=${val}|" "$SHARED"
    else
      printf '%s=%s\n' "$key" "$val" >> "$SHARED"
    fi
  done < "$PROFILE"
fi

set_shared_kv() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$SHARED" 2>/dev/null; then
    perl -i -pe "s/^\Q${key}\E=.*/${key}=${val}/" "$SHARED" 2>/dev/null || \
      sed -i '' "s|^${key}=.*|${key}=${val}|" "$SHARED"
  else
    printf '%s=%s\n' "$key" "$val" >> "$SHARED"
  fi
}

# Contraseña PFX — requerida para seed fiscal (no commitear shared.env).
if ! grep -q '^SAN_SEBASTIAN_SII_PFX_PASSWORD=.\+' "$SHARED" 2>/dev/null; then
  if [[ -n "${SAN_SEBASTIAN_SII_PFX_PASSWORD:-}" ]]; then
    set_shared_kv "SAN_SEBASTIAN_SII_PFX_PASSWORD" "$SAN_SEBASTIAN_SII_PFX_PASSWORD"
  else
    echo "[setup-ss] ERROR: defina SAN_SEBASTIAN_SII_PFX_PASSWORD en envs/shared.env o en el entorno." >&2
    echo "  Ejemplo: SAN_SEBASTIAN_SII_PFX_PASSWORD=*** bash scripts/setup-san-sebastian-dev.sh" >&2
    exit 1
  fi
fi

PFX_PASSWORD="$(grep '^SAN_SEBASTIAN_SII_PFX_PASSWORD=' "$SHARED" | head -1 | cut -d= -f2-)"

if [[ "$SKIP_SEED" != true ]]; then
  FISCAL_DIR="$ROOT/seeds/san-sebastian/data/fiscal"
  if [[ ! -f "$FISCAL_DIR/certificado.pfx" || ! -f "$FISCAL_DIR/caf-boleta-39.xml" ]]; then
    echo "[setup-ss] Exportando assets fiscales desde DB (npm run fiscal:export-ss-seed)…"
    (cd "$ROOT/kai-core" && npm run fiscal:export-ss-seed) || {
      echo "[setup-ss] AVISO: export falló — coloque certificado.pfx y caf-boleta-39.xml en $FISCAL_DIR" >&2
    }
  fi

  echo "[setup-ss] Ejecutando seed San Sebastián (TRUNCATE + catálogo + SII)…"
  SEED_LOG="$(mktemp)"
  if ! SAN_SEBASTIAN_SII_PFX_PASSWORD="$PFX_PASSWORD" npm run seed:san-sebastian --prefix seeds 2>&1 | tee "$SEED_LOG"; then
    rm -f "$SEED_LOG"
    exit 1
  fi

  COMPANY_ID="$(grep -Eo 'companyId=[0-9a-f-]{36}' "$SEED_LOG" | head -1 | cut -d= -f2)"
  rm -f "$SEED_LOG"
  if [[ -z "$COMPANY_ID" ]]; then
    echo "[setup-ss] ERROR: no se pudo leer companyId del seed." >&2
    exit 1
  fi
  set_shared_kv "NEXT_PUBLIC_COMPANY_ID_POS" "$COMPANY_ID"
  echo "[setup-ss] NEXT_PUBLIC_COMPANY_ID_POS=$COMPANY_ID"
fi

echo "[setup-ss] Sincronizando .env de apps (npm run env:dev)…"
npm run env:dev

echo ""
echo "[setup-ss] Listo — Supermercado San Sebastián"
echo "  Admin:  http://localhost:5031  →  admin / 098098"
echo "  POS:    http://localhost:5032  →  operador / 098098"
echo "  Levantar: npm run dev:san-sebastian"
