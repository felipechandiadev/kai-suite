# Pasos manuales post-migración F1

**Repo GitHub:** `felipechandiadev/kai-suite`  
**URL:** https://github.com/felipechandiadev/kai-suite  
(rename desde `flow-store-2` — julio 2026)

## Hecho (local)

1. ✅ GitHub rename → `kai-suite`
2. ✅ Local: `git remote set-url origin https://github.com/felipechandiadev/kai-suite.git`

## Pendiente — VPS

En el servidor (`DEPLOY_DIR`):

```bash
git remote set-url origin https://github.com/felipechandiadev/kai-suite.git
# o SSH, según cómo esté configurado el VPS:
# git remote set-url origin git@github.com:felipechandiadev/kai-suite.git
# / git@github.com-kai:felipechandiadev/kai-suite.git

git remote -v
git fetch
```

Verificar deploy key en:  
https://github.com/felipechandiadev/kai-suite/settings/keys

Actualizar también `deploy/vps-git-setup.sh` / `docs/vps-git-setup.md` si el script en el VPS aún apunta a la URL vieja (ya corregido en el monorepo).

GitHub redirige `flow-store-2` un tiempo; conviene usar solo `kai-suite` en remotes.
