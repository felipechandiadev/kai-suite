# KaiStore Lite — documentación

Guía de producto y desarrollo para la edición de escritorio **KaiStore Lite**.

| Documento | Contenido |
|-----------|-----------|
| [01-producto.md](./01-producto.md) | Definición, público, promesa, relación con el suite |
| [02-alcance-v1.md](./02-alcance-v1.md) | Qué entra / qué queda fuera (incl. sin SII) |
| [03-shell-ui.md](./03-shell-ui.md) | Una ventana, secciones POS / Admin / Impresoras, `@kai/ui` |
| [04-arquitectura.md](./04-arquitectura.md) | Tauri + Core Lite sidecar, SQLite, HTTP local, print `invoke` |
| [05-carpeta-y-versiones.md](./05-carpeta-y-versiones.md) | Layout en monorepo, SemVer, DMG/MSI |
| [06-riesgos-y-spike.md](./06-riesgos-y-spike.md) | Riesgos y spike |
| [07-decisiones-firmadas.md](./07-decisiones-firmadas.md) | **Decisiones cerradas** (producto + arquitectura + licencias) |
| [08-guia-desarrollo.md](./08-guia-desarrollo.md) | Resumen fases 0–10 |
| [09-licencias.md](./09-licencias.md) | Trial / licencia / emisión script |
| **[guia/](./guia/README.md)** | **Guía completa:** árbol, rutas, APIs, funciones por archivo, fases checklist |

## Principios firmados

1. Producto distinto del suite cloud (no es un tenant ni `KAI_SEED_MODE`).
2. Una empresa; datos en SQLite en el disco del dueño.
3. Una ventana: **POS · Admin · Impresoras**.
4. UI **`@kai/ui` completo** desde el inicio; Admin con IA de `kai-admin`; POS con paridad `kai-pos` (ports Vite, no iframes Next).
5. MVP con **compras/recepciones**, SERVICE, PACK, crédito interno; tesorería **solo caja POS**; usuarios con **roles**; **backup** y **seed mínimo**.
6. Core = **edición Lite de `kai-core`** (sidecar Node); print = motor compartido + **`invoke`**; sin SII.
7. Targets: **Apple Silicon + Windows x64**; installers **DMG + MSI**.
8. **Licencia:** sin emisión → trial 10 días; con licencia firmada → perpetua atada a máquina; emisión **script manual**.
9. Carpeta `kai-store-lite/` con SemVer propio.

## Cómo usar estos docs

1. Leer **07** (decisiones), **09** (licencias) y **02** (alcance).  
2. Implementar con la guía completa **[guia/](./guia/README.md)** (árbol, rutas, módulos, fases).  
3. Usar **08** solo como resumen; el detalle vive en `guia/`.  
4. Consultar **04** / **06** ante bloqueos técnicos.
