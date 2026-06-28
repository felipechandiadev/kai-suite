# Mapa — dónde lee el agente IA

Referencia rápida para onboarding con Cursor u otros agentes.

| Fuente | Rol | Estado |
|--------|-----|--------|
| `.cursor/rules/kai-platform.mdc` | Reglas monorepo Kai | **Principal** |
| `pwa-admin/AGENTS.md` | Reglas app admin | Activo |
| `pwa-pos/AGENTS.md` | Reglas app POS | Activo |
| `pwa-eshop/AGENTS.md` | Reglas eShop | Activo |
| `.instructions/backend.instruction` | CQRS NestJS | Deprecated → usar `.cursor/rules` |
| `.instructions/webadmin.instruction` | Server Actions admin | Deprecated → usar `.cursor/rules` |
| `docs/legacy/*INSTRUCTIONS*` | Histórico | Solo referencia |
| `~/.cursor/skills-cursor/` | Skills usuario | Fuera del repo |

## Migración

Ver [`MIGRACION-NOMBRES-KAISTORE.md`](./MIGRACION-NOMBRES-KAISTORE.md) fase F10.
