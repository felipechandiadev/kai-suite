# Kai Screen Android — instalación para operadores

Guía de 1 página para la **pantalla cliente** en la misma tablet donde corre el POS (Chrome).

## 1. Descargar

1. Abrí el **POS KaiStore** en Chrome (HTTPS).
2. Menú **Configuración** → **Impresión local**.
3. En **Pantalla cliente (Kai Screen)**, tocá **Descargar Kai Screen (Android)**.
4. Instalá `kai-screen-android.apk`.

## 2. Configurar Kai Screen

1. Abrí la app **Kai Screen**.
2. Activá **Iniciar servicio** (notificación «Kai Screen activo»).
3. Si el POS usa HTTPS: **Confiar certificado WSS** y aceptá en Chrome `https://127.0.0.1:14571`.
4. Verificá que aparezca **Pantalla cliente conectada** (requiere segunda pantalla física).

## 3. Conectar el POS

En el POS → **Impresión local** → sección **Pantalla cliente**:

| Campo | Valor típico |
|-------|----------------|
| Activar Kai Screen | Sí |
| Host | `127.0.0.1` |
| Usar WSS | Sí (POS HTTPS) |
| Puerto | `14571` |

Guardá y usá **Probar pantalla** para validar.

## 4. Uso en caja

- Al agregar productos, el cliente ve el carrito y el **total** en la pantalla secundaria.
- Al completar la venta, aparece «Gracias por su compra» y vuelve a bienvenida.
- Si Kai Screen no está activo, el POS sigue vendiendo con normalidad.

## Problemas frecuentes

| Síntoma | Qué revisar |
|---------|-------------|
| «Sin pantalla secundaria» | Cable HDMI / hardware dual-screen; modelo Sunmi/iMin |
| POS desconectado | Servicio Kai Screen activo; WSS y certificado confiado |
| Total no actualiza | Activar Kai Screen en ajustes POS; misma tablet |

## Puertos

- Kai Printers: WS `14567`, WSS `14568`
- Kai Screen: WS `14570`, WSS `14571`
