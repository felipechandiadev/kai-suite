# Deploy — descargas Kai Printers / Kai CFD

Los instalables se sirven desde una **carpeta pública** (CDN, bucket, etc.), no desde el VPS del POS.
POS y Admin leen los manifests en runtime desde `KAI_DOWNLOADS_URL`.

**Documentación completa:** [kai-pos/public/downloads/README.md](../kai-pos/public/downloads/README.md)

## Resumen

```bash
# 1. Local — compilar y preparar (deja todo en dist/kai-downloads/)
npm run kai-printers:release
npm run kai-screen:release

# 2. Subir dist/kai-downloads/* (binarios primero, manifests después) a la carpeta pública

# 3. Env del tenant (kai-pos y kai-admin) — una sola vez
KAI_DOWNLOADS_URL=https://cdn.tu-dominio.cl/kai-downloads

# 4. Verificar
curl -I https://cdn.tu-dominio.cl/kai-downloads/kai-printers-windows.manifest.json
```

Cambiar `KAI_DOWNLOADS_URL` solo requiere reiniciar POS/Admin (no rebuild). Publicar una versión nueva
no requiere ni reinicio: los manifests se releen cada 5 minutos.
