# Implementaciones futuras

Registro de **capacidades planificadas** que aún no forman parte del producto en producción. Cada implementación tiene su propio documento de diseño; el [roadmap](./ROADMAP.md) concentra fases, prioridades y tareas ejecutables.

**Última revisión:** junio 2026

---

## Cómo usar esta carpeta

| Acción | Dónde |
|--------|--------|
| Ver visión y alcance de una iniciativa | Documento `IF-XX-*.md` |
| Priorizar, asignar fases y marcar avance | [ROADMAP.md](./ROADMAP.md) |
| Entender el ecosistema actual | [ARQUITECTURA](../project/ARQUITECTURA_Y_ECOSISTEMA.md) §10 |
| Spec del agente de escritorio (referencia protocolo) | [print_service_app_developer_guide_v2.md](../legacy/print_service_app_developer_guide_v2.md) |

### Convención de IDs

- **IF-XX** — Implementación futura (documento de diseño)
- Tareas en roadmap: **IF-XX.Tn** (T = tarea dentro de la implementación)

### Estados (roadmap)

| Estado | Significado |
|--------|-------------|
| **Idea** | Hipótesis o necesidad; sin diseño cerrado |
| **Diseño** | Documento IF en elaboración |
| **Listo** | Diseño aprobado; puede entrar a desarrollo |
| **En curso** | Implementación activa en el monorepo |
| **Hecho** | Entregado y usable en al menos un entorno |
| **Pospuesto** | Fuera de foco temporal |

---

## Registro de implementaciones

| ID | Título | Estado | Documento |
|----|--------|--------|-----------|
| IF-01 | Kai Printers — app nativa Android | Diseño | [IF-01-kai-printers-android-nativo.md](./IF-01-kai-printers-android-nativo.md) |
| IF-02 | POS offline-first — operación completa sin red | Diseño | [IF-02-pos-offline-first.md](./IF-02-pos-offline-first.md) |
| IF-03 | Mensajería y colas — ventas, stock y eShop | Diseño | [IF-03-mensajeria-eventos-ventas-stock.md](./IF-03-mensajeria-eventos-ventas-stock.md) |
| IF-04 | Cuentas por pagar en POS | Diseño | [IF-04-pos-cuentas-por-pagar.md](./IF-04-pos-cuentas-por-pagar.md) |
| IF-05 | Crédito de clientes en POS | Diseño | [IF-05-pos-credito-clientes.md](./IF-05-pos-credito-clientes.md) |
| IF-06 | eShop — plantillas y tema dinámico | Hecho (F1) | [IF-06-eshop-plantillas-y-tema.md](./IF-06-eshop-plantillas-y-tema.md) |
| IF-07 | eShop — Topbar y Footer administrables | Hecho (F1) | [IF-07-eshop-topbar-footer.md](./IF-07-eshop-topbar-footer.md) |
| IF-08 | eShop — portal cliente y encargos unificados | En curso | [IF-08-eshop-portal-y-encargos-unificados.md](./IF-08-eshop-portal-y-encargos-unificados.md) |
| IF-09 | Formatos impresión 58/80/carta/A4 | Hecho | [IF-09-formatos-impresion-58-80-carta-a4.md](./IF-09-formatos-impresion-58-80-carta-a4.md) |
| IF-10 | Kai Screen — pantalla cliente | Hecho (MVP) | [IF-10-kai-screen-pantalla-cliente.md](./IF-10-kai-screen-pantalla-cliente.md) |
| IF-11 | Kai Scale — balanza serial joyería | Hecho (MVP) | [IF-11-kai-scale-balanza-serial.md](./IF-11-kai-scale-balanza-serial.md) |
| IF-12 | Mercado Pago — POS Point + eShop Bricks | En curso | [IF-12-mercado-pago-pos-y-eshop.md](./IF-12-mercado-pago-pos-y-eshop.md) |

---

## Relación con otros documentos

| Documento | Rol |
|-----------|-----|
| [KAISTORE_ROADMAP.md](../legacy/KAISTORE_ROADMAP.md) | Roadmap **producto** retail/KaiFood (P1–P6) |
| [ROADMAP.md](./ROADMAP.md) | Roadmap **técnico** de implementaciones futuras (esta carpeta) |
| [inconsistencias/](../project/inconsistencias/README.md) | Deuda doc ↔ código del producto **actual** |

Al cerrar una implementación futura: mover referencias a `docs/project/`, actualizar AR § correspondiente y marcar IF como **Hecho** en el roadmap.
