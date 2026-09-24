# Paso 09 — Quitar sidecar

## Objetivo

Dejar de spawnar Node; eliminar recursos sidecar del bundle.

## Tareas

1. ~~Default `KAI_LITE_BACKEND=rust`.~~ → flag eliminado; solo rust.  
2. ~~`spawn.rs`: no arrancar sidecar.~~ → módulo `sidecar/` eliminado.  
3. ~~Remover `resources/sidecar` de `tauri.conf.json`.~~  
4. ~~Deprecar scripts `stage:sidecar:*`.~~ → scripts eliminados.  

## Criterios de done

- [x] App abre sin `bin/node` / sin puerto `:4100`  
- [x] Splash espera `lite_health`  
- [x] Builds sin stage sidecar  
- [x] `liteFetch` siempre `invoke`  

## Rollback

Release histórica con sidecar (no en árbol actual).
