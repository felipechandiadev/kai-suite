# Kai Screen Android — instalación para operadores

Guía de 1 página para la **pantalla cliente** en la misma tablet donde corre el POS (Chrome).

## 1. Descargar

1. Abrí el **POS KaiStore** en Chrome (HTTPS).
2. Menú **Configuración** → **Impresión local**.
3. En **Pantalla cliente (Kai Screen)**, tocá **Descargar v…** (el número de versión lo muestra el botón).
4. Instalá el APK (`kai-screen-android-{versión}.apk`).

Si Chrome no descarga, abrí el enlace del APK en una pestaña nueva.

## 2. Configurar Kai Screen (app Android)

1. Abrí la app **Kai Screen**.
2. En **Conectar con el POS**, completá los pasos en orden:
   - **Paso 1:** activá el servicio (notificación «Kai Screen activo»).
   - **Paso 2:** si el POS usa HTTPS, abrí el certificado en Chrome (`https://127.0.0.1:14571`) y tocá **Verificar servidor WSS**.
   - **Paso 4:** verificá que aparezca **Pantalla cliente conectada** (requiere segunda pantalla física).
   - Opcional: **Probar pantalla cliente** sin el POS.
3. Cuando veas **Listo para caja**, la app está operativa.

## 3. Conectar el POS

En el POS → **Impresión local** → sección **Pantalla cliente**:

| Campo | Valor típico |
|-------|----------------|
| Activar Kai Screen | Sí |
| Host | `127.0.0.1` |
| Usar WSS | Sí (POS HTTPS) |
| Puerto | `14571` |

Revisá el **Estado operativo** (checklist) y usá **Probar pantalla** para validar.

## 4. Uso en caja

- Al agregar productos, el cliente ve el carrito y el **total** en la pantalla secundaria.
- Al completar la venta, aparece «Gracias por su compra» y vuelve a bienvenida.
- Si Kai Screen no está activo, el POS sigue vendiendo con normalidad.

## Problemas frecuentes

| Síntoma | Qué revisar |
|---------|-------------|
| «Sin pantalla secundaria» | Cable HDMI / hardware dual-screen; modelo Sunmi/iMin |
| POS desconectado | Servicio Kai Screen activo; WSS y certificado confiado en Chrome |
| Total no actualiza | Activar Kai Screen en ajustes POS; misma tablet |
| Descarga 404 | Ejecutar `npm run kai-screen:publish` en el servidor de deploy |

## Puertos

- Kai Printers: WS `14567`, WSS `14568`
- Kai Screen: WS `14570`, WSS `14571`
