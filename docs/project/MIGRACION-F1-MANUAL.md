# Pasos manuales post-migración F1

Tras mergear los cambios de código:

1. **GitHub:** Settings → Rename repository `flow-store-2` → `kai`
2. **Local:** `git remote set-url origin git@github.com:felipechandiadev/kai.git`
3. **VPS:** mismo `git remote set-url` en `DEPLOY_DIR` y verificar deploy key en `https://github.com/felipechandiadev/kai/settings/keys`
4. **Desktop local:** renombrar carpeta `print-service/` → `kai-printers-desktop/` si compilás Tauri

GitHub redirige `flow-store-2` un tiempo; actualizá remotes el mismo día.
