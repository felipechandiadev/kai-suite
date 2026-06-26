# INC-15 · Prefijo API

| Campo | Valor |
|-------|-------|
| **Severidad** | Menor |
| **Estado** | Resuelta |
| **Detectado** | junio 2026 |

---

## Resumen

Documentación indica base URL `http://localhost:5030/api`. Comportamiento correcto; aclaración menor sobre formato env.

---

## Evidencia

| Fuente | Valor |
|--------|-------|
| `backend/.env.example` | `API_PREFIX=api` (sin `/` inicial) |
| `main.ts` | `app.setGlobalPrefix(configService.app.apiPrefix)` |
| URLs reales | `/api/transactions`, `/api/health`, etc. |

---

## Conclusión

No hay bug. Opcional: nota en MODULOS de que `API_PREFIX` en env no incluye barra inicial.

[← Índice](./README.md) · [COHERENTE.md](./COHERENTE.md)
