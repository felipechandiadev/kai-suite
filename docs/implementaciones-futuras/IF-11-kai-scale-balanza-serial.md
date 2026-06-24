# IF-11 · Balanza serial para joyería (Web Serial)

| Campo | Valor |
|-------|-------|
| **ID** | IF-11 |
| **Estado** | Implementado (MVP junio 2026) |
| **Prioridad** | P2 |
| **Última revisión** | junio 2026 |

---

## 1. Resumen

Integración de **balanza USB-serial** en **pwa-admin** para leer peso en la calculadora de precio de joyería. La configuración persiste en **localStorage** del navegador; el acceso al hardware usa **Web Serial API** (Chrome/Edge).

| Componente | Rol |
|------------|-----|
| `packages/scale-service-client` | Contrato, storage, parser de tramas y Web Serial |
| `pwa-admin` `/settings/scale` | Configuración y prueba de lectura |
| `pwa-admin` `VariantJewelryPriceCalculatorDialog` | Botón «Leer balanza» |

**Fuera de alcance MVP:** pwa-pos (precios ya fijados en variante), persistencia en backend, agente local separado.

---

## 2. Web Serial

- Navegador: **Chrome / Edge** en el mismo PC con balanza USB.
- Storage key: `flowstore.admin.scale.v1`
- Filtros USB: vendor `0x0403`, product `0x6001` (FTDI) por defecto.
- Parámetros: 9600 8N1, delimitador `\r\n`, comando opcional.

---

## 3. Formato de trama

Ejemplo: `+000125.00 g\r\n`

Parser en `scale-service-client/src/parse.ts` (portado desde flow-store/desktop).

Unidades soportadas: `g`, `oz`, `ct` → normalización a gramos para `computeJewelryNetPrice`.

---

## 4. Flujo operador

1. Conectar balanza USB al PC de administración.
2. **Configuración → Balanza** → habilitar → autorizar puerto USB.
3. **Probar lectura** en settings.
4. **Catálogo → Productos → variante** → calculadora joyería (ícono gema) → **Leer balanza**.

Guía: [INSTALACION_KAI_SCALE.md](../../pwa-admin/public/downloads/INSTALACION_KAI_SCALE.md).

---

## 5. Criterios de aceptación MVP

1. Settings guarda config en localStorage y prueba lectura.
2. Calculadora joyería rellena peso en gramos desde balanza.
3. Sin config: mensaje guiado a `/settings/scale`.
4. Tests vitest en `scale-service-client`.

---

## 6. Extensiones post-MVP

- Botón leer balanza en `VariantWeightFields`
- Soporte de más modelos de balanza / filtros USB

[← IF-10](./IF-10-kai-screen-pantalla-cliente.md) · [Roadmap](./ROADMAP.md)
