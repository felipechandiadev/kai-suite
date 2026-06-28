# Git en el VPS (GitHub)

Script para conectar el servidor con el repositorio **kai** vía SSH.

## Repositorio

| Tipo | URL |
|------|-----|
| HTTPS | `https://github.com/felipechandiadev/kai.git` |
| SSH | `git@github.com:felipechandiadev/kai.git` |

## Setup automático

En el VPS:

```bash
curl -fsSL https://raw.githubusercontent.com/felipechandiadev/kai/main/deploy/vps-git-setup.sh -o vps-git-setup.sh
chmod +x vps-git-setup.sh
./vps-git-setup.sh
```

Desde tu máquina local:

```bash
scp deploy/vps-git-setup.sh usuario@IP_DEL_VPS:/tmp/
ssh usuario@IP_DEL_VPS 'bash /tmp/vps-git-setup.sh'
```

### Variables opcionales

```bash
GIT_NAME="Felipe" \
GIT_EMAIL="tu@email.com" \
DEPLOY_DIR=/var/www/kai \
BRANCH=main \
./vps-git-setup.sh
```

## Qué hace el script

1. Instala `git` y `openssh-client` si faltan.
2. Configura identidad Git.
3. Genera clave SSH `~/.ssh/id_ed25519_kai` (si no existe).
4. Añade host `github.com-kai` en `~/.ssh/config`.
5. Muestra la clave pública para GitHub.
6. Prueba `ssh -T` contra GitHub.
7. Opcionalmente clona o actualiza en `~/kai` (o `DEPLOY_DIR`).
8. Crea `~/bin/kai-git-pull`.

## Registrar la clave en GitHub

1. [Settings → Deploy keys](https://github.com/felipechandiadev/kai/settings/keys)
2. **Add deploy key** → pegar la clave pública.
3. Dejar **Allow write access** desmarcado si el VPS solo hace `git pull`.

## Actualizar código en el VPS

```bash
~/bin/kai-git-pull
```

O manualmente:

```bash
cd ~/kai
git fetch origin main
git checkout main
git reset --hard origin/main
```

## Solución de problemas

| Error | Qué revisar |
|-------|-------------|
| `Permission denied (publickey)` | Deploy key no registrada |
| `Repository not found` | Repo renombrado a `kai`; actualizar remote |

Ver [`deploy/vps-git-setup.sh`](../deploy/vps-git-setup.sh).
