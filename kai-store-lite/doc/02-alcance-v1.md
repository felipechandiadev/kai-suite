# 02 — Alcance v1

Alineado a [07-decisiones-firmadas.md](./07-decisiones-firmadas.md).

## Entra (MVP)

### POS (paridad UX con `kai-pos`)

- Venta mostrador (líneas, totales, IVA).
- Sesión de caja (apertura / cierre).
- Medios de pago: efectivo, débito, crédito, transferencia.
- **Crédito interno** a cliente.
- Productos **PHYSICAL**, **SERVICE** y **PACK**.
- Clientes (opcional en ticket).
- Ticket térmico / PDF vía motor embebido (`invoke`).

### Admin (misma estructura/IA que `kai-admin`, recortada)

- Catálogo: PHYSICAL, SERVICE, PACK.
- Listas / precios básicos.
- Existencias y almacenes (1–3).
- **Compras / recepciones** y proveedores.
- Clientes.
- Puntos de venta y **caja POS** (tesorería limitada a caja; sin banco ni gastos operativos).
- Impuestos IVA (configuración local, **no** emisión SII).
- Una sucursal; N puntos de venta en el mismo equipo.
- Usuarios con **roles**.
- **Backup / restore** de la base desde la app.

### Impresoras

- UI y motor equivalentes a `kai-printers-desktop`, **dentro** de la misma app.
- Mapeo de impresoras; print solo por **`invoke`** (v1).
- No es un segundo `.app` / `.exe`.

### Primer arranque

- **Licencia / trial:** sin licencia emitida → **trial 10 días**; con licencia firmada para esa máquina → uso perpetuo. Ver [09-licencias.md](./09-licencias.md).
- **Seed mínimo** si la base está vacía (tras poder operar en trial o con licencia).

### Licenciamiento

- Emisión **manual por script** (`issue-license`).
- Sin reactivaciones gratis al cambiar disco/PC.
- Usuarios ilimitados respecto a la licencia.

## Queda fuera (v1 y edición Lite)

| Módulo / capacidad | Motivo |
|--------------------|--------|
| **SII** (CAF, certificado, boleta/factura electrónica, folios) | Decisión de producto |
| Capital humano (empleados, jornadas, liquidaciones) | Complejidad ERP |
| Contabilidad completa (plan de cuentas, asientos) | Fuera de tienda pequeña |
| Tesorería bancaria / gastos operativos / cheques | Solo caja POS en Lite |
| eShop, delivery, landing | Cloud / multi-canal |
| Kai Food (mesas, KDS, mesero, propinas, carta) | Otro vertical |
| Lavandería, taller / producción avanzada, joyería | Verticales suite |
| Multi-empresa / selector de compañía | Single-tenant |
| SaMI / analytics avanzado | Suite |
| Segunda caja en **otro PC** con el mismo SQLite | Un PC = fuente de verdad |
| Agente Printers WS en LAN obligatorio | Solo `invoke` interno en v1 |
| Portal web de emisión / pago online | Emisión v1 = script manual |
| Reactivaciones gratis por cambio de disco | Política comercial fuera del soft automático |

## Fiscal en Lite (sin SII)

- IVA calculado en ventas/compras para operación interna y tickets.
- Documentos de caja / comprobantes **no** electrónicos ante el SII.
- No se pide certificado PFX ni CAF.
