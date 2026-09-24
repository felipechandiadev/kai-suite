# Paso 10 — Packaging slim

## Objetivo

Instaladores Mac/Windows/Linux sin Node; tamaño << 100 MB objetivo práctico.

## Tareas

1. Actualizar [../guia/fases/fase-09-packaging.md](../../guia/fases/fase-09-packaging.md).  
2. Rebuild DMG / portable Win / deb bookworm.  
3. Verificar Chromebook: install + health sin `EACCES logs/` ni `@kai/fiscal-ted`.  
4. Bump versión según VERSIONS.md.  

## Criterios de done

- [x] Scripts de build sin stage sidecar; `tauri.conf` sin `resources/sidecar`  
- [x] Docs packaging y rust-lite README estado **S4 / cutover done**  
- [ ] Artefactos release en `dist-release/` (smoke por plataforma)  
- [ ] Smoke en Mac + Linux bookworm