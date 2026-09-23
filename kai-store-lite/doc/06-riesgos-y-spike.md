# 06 — Riesgos y spike

Decisiones: [07-decisiones-firmadas.md](./07-decisiones-firmadas.md).  
Orden de fases: [08-guia-desarrollo.md](./08-guia-desarrollo.md).

## Riesgos principales

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Postgres-isms en Core (`jsonb`, SQL crudo, migraciones) | Bloquea SQLite | Spike Fase 3; esquema Lite; documentar parches |
| Redis en caminos de venta | Lite no puede exigir Redis | Cache memoria / no-op en edición Lite |
| `@kai/ui` acoplado a Next | Bloquea Admin/POS Vite | Fase 2 obligatoria antes del port masivo |
| Port Admin/POS (paridad) | Alcance grande | IA recortada a módulos Lite; fases 6–7; no iframe Next |
| MVP denso (recepciones + PACK + SERVICE + crédito + roles + backup) | Retraso | No añadir SII/HCM/banco; seguir fases 0–10 |
| Sidecar Node en instalador | Tamaño / arranque | Empaquetar Node runtime mínimo; health + restart desde shell |
| SQLite multi-PC | Corrupción | Un PC; copy en UI |
| Scope creep (SII, HCM, Food, banco) | Nunca llega v1 | Alcance en 02 y 07 |
| Bypass trivial de trial/licencia solo en JS | Piratería fácil | Verify + reloj trial en **Rust**; [09-licencias.md](./09-licencias.md) |

## Spike (cubre inicio de Fases 1–4)

Objetivo: validar shell + UI Kai + Core SQLite + print `invoke`, **no** el ERP completo.

1. Scaffold Tauri + Vite; segmentos POS \| Admin \| Impresoras; tray.
2. Importar `@kai/ui` (incl. al menos un control “pesado” si el adaptador ya existe; si no, plan de adaptación documentado).
3. Sidecar Core Lite + SQLite smoke + `/api/health`.
4. Stub cobrar → `invoke` print test.
5. **Documento de hallazgos** (bloqueos SQLite/UI/sidecar) → actualizar 04/06 si hace falta.

**Éxito:** build Mac Apple Silicon (y smoke Windows si hay runner); navegación 3 secciones; health Core; ticket de prueba.

## Fuera del spike

- Paridad completa Admin/POS.
- Recepciones/PACK/crédito end-to-end (van en fases 6–8).
- DMG/MSI finales (Fase 9).

## Tras el spike

Seguir [08-guia-desarrollo.md](./08-guia-desarrollo.md) desde donde el spike haya dejado evidencia (típicamente continuar Fase 2–5). Licencias: [09-licencias.md](./09-licencias.md).
