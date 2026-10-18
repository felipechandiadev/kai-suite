# Deploy — descargas Kai Printers en el VPS

Los instalables pueden servirse desde **`/downloads/`** del POS (legacy) o desde **R2/CDN** vía Kai Ops (`publish-printers-r2` + `NEXT_PUBLIC_KAI_PRINTERS_*` en el `.env` del tenant).

**Recomendado (R2):** en kai-deployments, configurar Almacenamiento (URL pública CDN + bucket) y en el tenant **Publicar Kai Printers**; luego `render-tenant-env.sh` y redeploy POS.

**Legacy:** `.apk` / `.zip` en `.gitignore`. Un `git pull` solo actualiza manifests; sin **rsync** las descargas dan 404.

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
