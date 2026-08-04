# Deploy — descargas Kai Printers en el VPS

Los instalables de Kai Printers se sirven como archivos estáticos en **`/downloads/`** del POS.

**Importante:** `.apk` / `.zip` / `.dmg` están en `.gitignore`. Un `git pull` solo actualiza manifests; sin **rsync** de binarios las descargas dan 404.

**Documentación completa:** [kai-pos/public/downloads/README.md](../kai-pos/public/downloads/README.md)

## Resumen

```bash
# 1. Local — publicar todas las plataformas
npm run kai-printers:publish

# 2. Commit manifests (no binarios)
git add kai-pos/public/downloads/kai-printers-*.manifest.json
git commit -m "chore(printers): actualizar manifests Kai Printers"
git push

# 3. VPS — pull
ssh usuario@vps 'cd /ruta/kai && git pull'

# 4. Local → VPS — binarios (apk, zip, dmg)
rsync -avz kai-pos/public/downloads/ \
  usuario@vps:/ruta/kai/kai-pos/public/downloads/

# 5. Verificar
curl -I https://pos.tu-dominio.cl/downloads/kai-printers-android.manifest.json
```
