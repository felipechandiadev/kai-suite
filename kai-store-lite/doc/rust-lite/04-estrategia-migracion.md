# 04 — Estrategia de migración

## Fases de coexistencia

```mermaid
flowchart LR
  S1[sidecar_only]
  S2[dual_flag]
  S3[rust_default]
  S4[sidecar_removed]
  S1 --> S2 --> S3 --> S4
```

| Fase | UI | Backend | Packaging |
|------|-----|---------|-----------|
| S1 | HTTP `:4100` | Node sidecar | Node en resources |
| S2 | Flag `KAI_LITE_BACKEND` | Ambos | Ambos |
| S3 | Default rust | rust; sidecar opcional | Node hasta S4 |
| **S4 (actual)** | Solo `invoke` | rust sqlx | Sin sidecar |

## Feature flag

Eliminado. No hay `KAI_LITE_BACKEND`. La UI usa siempre `liteFetch` → `invoke("lite_*")`.

## Criterio de cutover (S3→S4)

- [x] Matriz [pruebas/matriz-metodos.md](./pruebas/matriz-metodos.md) happy paths en verde (cargo `lite_*`)  
- [x] Packaging Mac + Windows + Linux bookworm sin `resources/sidecar`  
- [x] Docs fase-09 / README actualizadas  
- [ ] Smoke manual release: login → venta → void → cierre caja → ticket print  

## Rollback

Git history / release etiquetada “last sidecar” si hiciera falta reabrir perfil Nest (no soportado en builds actuales).
