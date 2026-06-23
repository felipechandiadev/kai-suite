# Git en el VPS (GitHub)

Script para conectar el servidor con el repositorio **flow-store-2** vía SSH.

## Repositorio

| Tipo | URL |
|------|-----|
| HTTPS | `https://github.com/felipechandiadev/flow-store-2.git` |
| SSH | `git@github.com:felipechandiadev/flow-store-2.git` |

## Setup automático

En el VPS:

```bash
curl -fsSL https://raw.githubusercontent.com/felipechandiadev/flow-store-2/main/deploy/vps-git-setup.sh -o vps-git-setup.sh
chmod +x vps-git-setup.sh
./vps-git-setup.sh
```

Desde tu máquina local (si aún no está en GitHub):

```bash
scp deploy/vps-git-setup.sh usuario@IP_DEL_VPS:/tmp/
ssh usuario@IP_DEL_VPS 'bash /tmp/vps-git-setup.sh'
```

### Variables opcionales

```bash
GIT_NAME="Felipe" \
GIT_EMAIL="tu@email.com" \
DEPLOY_DIR=/var/www/flow-store-2 \
BRANCH=main \
./vps-git-setup.sh
```

## Qué hace el script

1. Instala `git` y `openssh-client` si faltan (Debian/Ubuntu/RHEL).
2. Configura `user.name` y `user.email` de Git.
3. Genera clave SSH `~/.ssh/id_ed25519_flowstore` (si no existe).
4. Añade host `github.com-flowstore` en `~/.ssh/config`.
5. Muestra la **clave pública** para pegarla en GitHub.
6. Prueba `ssh -T` contra GitHub.
7. Opcionalmente clona o actualiza el repo en `~/flow-store-2` (o `DEPLOY_DIR`).
8. Crea `~/bin/flow-store-git-pull` para actualizar con un solo comando.

## Registrar la clave en GitHub

**Recomendado — Deploy key** (solo este repo, sin permisos de escritura):

1. [Settings → Deploy keys](https://github.com/felipechandiadev/flow-store-2/settings/keys)
2. **Add deploy key** → pegar la clave pública del script.
3. Dejar **Allow write access** desmarcado si el VPS solo hace `git pull`.

## Actualizar código en el VPS

```bash
~/bin/flow-store-git-pull
```

O manualmente:

```bash
cd ~/flow-store-2   # o tu DEPLOY_DIR
git fetch origin main
git checkout main
git reset --hard origin/main
```

## Solución de problemas

| Error | Qué revisar |
|-------|-------------|
| `Permission denied (publickey)` | Deploy key no registrada o clave equivocada |
| `Host key verification failed` | Ejecutar de nuevo el script (añade `known_hosts`) |
| `Repository not found` | La deploy key debe ser del repo correcto o usar SSH de cuenta con acceso |

## Variables de entorno de las apps

Tras clonar, copia los envs de desarrollo/producción:

```bash
cp envs/backend.env backend/.env
# ... ver envs/README.md
```

En producción ajusta URLs, secretos JWT y `CORS_ORIGIN` con el dominio real del VPS.
