#!/usr/bin/env bash
# =============================================================================
# KaiStore / flow-store-2 — configurar Git + SSH en el VPS (GitHub)
#
# Uso en el VPS:
#   curl -fsSL https://raw.githubusercontent.com/felipechandiadev/flow-store-2/main/deploy/vps-git-setup.sh -o vps-git-setup.sh
#   chmod +x vps-git-setup.sh
#   ./vps-git-setup.sh
#
# O copiar desde tu máquina:
#   scp deploy/vps-git-setup.sh usuario@tu-vps:/tmp/
#   ssh usuario@tu-vps 'bash /tmp/vps-git-setup.sh'
#
# Variables opcionales:
#   GIT_NAME="Felipe" GIT_EMAIL="tu@email.com" DEPLOY_DIR=/var/www/flow-store-2 ./vps-git-setup.sh
# =============================================================================

set -euo pipefail

REPO_SSH="git@github.com:felipechandiadev/flow-store-2.git"
REPO_HTTPS="https://github.com/felipechandiadev/flow-store-2.git"
SSH_KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/id_ed25519_flowstore}"
DEPLOY_DIR="${DEPLOY_DIR:-$HOME/flow-store-2}"
GIT_NAME="${GIT_NAME:-KaiStore VPS}"
GIT_EMAIL="${GIT_EMAIL:-vps@kaistore.local}"
BRANCH="${BRANCH:-main}"

info()  { printf '\033[1;36m→\033[0m %s\n' "$*"; }
ok()    { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn()  { printf '\033[1;33m!\033[0m %s\n' "$*"; }
err()   { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Falta el comando '$1'. Instálalo y vuelve a ejecutar este script."
    exit 1
  fi
}

install_git_if_needed() {
  if command -v git >/dev/null 2>&1; then
    ok "git ya instalado: $(git --version)"
    return
  fi
  info "Instalando git..."
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -qq
    sudo apt-get install -y git openssh-client
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y git openssh-clients
  elif command -v yum >/dev/null 2>&1; then
    sudo yum install -y git openssh-clients
  else
    err "No se detectó apt/dnf/yum. Instala git manualmente."
    exit 1
  fi
  ok "git instalado"
}

configure_git_identity() {
  git config --global user.name "$GIT_NAME"
  git config --global user.email "$GIT_EMAIL"
  git config --global init.defaultBranch main
  git config --global pull.rebase false
  ok "Identidad git: $GIT_NAME <$GIT_EMAIL>"
}

setup_ssh_key() {
  mkdir -p "$HOME/.ssh"
  chmod 700 "$HOME/.ssh"

  if [[ -f "$SSH_KEY_PATH" ]]; then
    warn "Ya existe la clave $SSH_KEY_PATH — se reutiliza."
  else
    info "Generando clave SSH ed25519 en $SSH_KEY_PATH"
    ssh-keygen -t ed25519 -C "flow-store-2-vps-$(hostname)" -f "$SSH_KEY_PATH" -N ""
    ok "Clave generada"
  fi

  chmod 600 "$SSH_KEY_PATH"
  chmod 644 "${SSH_KEY_PATH}.pub"

  local ssh_config="$HOME/.ssh/config"
  if ! grep -q "Host github.com-flowstore" "$ssh_config" 2>/dev/null; then
    cat >>"$ssh_config" <<EOF

# flow-store-2 deploy (añadido por vps-git-setup.sh)
Host github.com-flowstore
  HostName github.com
  User git
  IdentityFile $SSH_KEY_PATH
  IdentitiesOnly yes
EOF
    chmod 600 "$ssh_config"
    ok "Entrada SSH github.com-flowstore en ~/.ssh/config"
  fi

  if ! ssh-keygen -F github.com >/dev/null 2>&1; then
    info "Añadiendo github.com a known_hosts..."
    ssh-keyscan -t ed25519 github.com >>"$HOME/.ssh/known_hosts" 2>/dev/null
    chmod 644 "$HOME/.ssh/known_hosts"
  fi
}

print_github_instructions() {
  echo ""
  echo "=============================================================================="
  echo "  PASO MANUAL — registrar la clave en GitHub"
  echo "=============================================================================="
  echo ""
  echo "Opción A — Deploy key (recomendada, solo este repo):"
  echo "  1. Abre: https://github.com/felipechandiadev/flow-store-2/settings/keys"
  echo "  2. Add deploy key → Title: VPS $(hostname)"
  echo "  3. Pega la clave pública de abajo"
  echo "  4. Deja 'Allow write access' DESMARCADO si el VPS solo hace pull"
  echo ""
  echo "Opción B — SSH key de tu cuenta GitHub (varios repos):"
  echo "  https://github.com/settings/ssh/new"
  echo ""
  echo "--- CLAVE PÚBLICA (copiar todo) ---"
  cat "${SSH_KEY_PATH}.pub"
  echo "--- FIN CLAVE PÚBLICA ---"
  echo ""
  read -r -p "Pulsa Enter cuando hayas pegado la clave en GitHub..." _
}

test_github_ssh() {
  info "Probando conexión SSH con GitHub..."
  if ssh -T git@github.com-flowstore 2>&1 | grep -qi "successfully authenticated"; then
    ok "GitHub acepta la clave SSH"
    return 0
  fi
  if ssh -T git@github.com-flowstore 2>&1 | grep -qi "Hi "; then
    ok "Conexión SSH con GitHub OK"
    return 0
  fi
  err "No se pudo autenticar con GitHub. Revisa que la deploy key esté registrada."
  exit 1
}

clone_or_update_repo() {
  local repo_url="git@github.com-flowstore:felipechandiadev/flow-store-2.git"

  if [[ -d "$DEPLOY_DIR/.git" ]]; then
    info "Repo existente en $DEPLOY_DIR — git fetch + reset a origin/$BRANCH"
    cd "$DEPLOY_DIR"
    git remote set-url origin "$repo_url"
    git fetch origin "$BRANCH"
    git checkout "$BRANCH"
    git reset --hard "origin/$BRANCH"
    ok "Código actualizado en $DEPLOY_DIR"
  else
    info "Clonando en $DEPLOY_DIR ..."
    mkdir -p "$(dirname "$DEPLOY_DIR")"
    GIT_SSH_COMMAND="ssh -i $SSH_KEY_PATH -o IdentitiesOnly=yes" \
      git clone --branch "$BRANCH" "$repo_url" "$DEPLOY_DIR"
    ok "Clonado en $DEPLOY_DIR"
  fi
}

write_helper_script() {
  local helper="$HOME/bin/flow-store-git-pull"
  mkdir -p "$HOME/bin"
  cat >"$helper" <<SCRIPT
#!/usr/bin/env bash
set -euo pipefail
cd "$DEPLOY_DIR"
git fetch origin $BRANCH
git checkout $BRANCH
git reset --hard origin/$BRANCH
echo "OK: \$(git rev-parse --short HEAD) — \$(git log -1 --format=%s)"
SCRIPT
  chmod +x "$helper"
  ok "Helper creado: $helper"
}

echo ""
info "KaiStore VPS — setup Git + GitHub"
echo ""

require_cmd bash
install_git_if_needed
configure_git_identity
setup_ssh_key
print_github_instructions
test_github_ssh

read -r -p "¿Clonar/actualizar el repo en $DEPLOY_DIR? [s/N] " CLONE
if [[ "${CLONE,,}" == "s" || "${CLONE,,}" == "si" || "${CLONE,,}" == "y" ]]; then
  clone_or_update_repo
  write_helper_script
fi

echo ""
ok "Listo. Comandos útiles:"
echo "  ssh -T git@github.com-flowstore"
echo "  $HOME/bin/flow-store-git-pull"
echo "  cd $DEPLOY_DIR && git status"
echo ""
echo "Remoto SSH: git@github.com-flowstore:felipechandiadev/flow-store-2.git"
echo "HTTPS:      $REPO_HTTPS"
echo ""
