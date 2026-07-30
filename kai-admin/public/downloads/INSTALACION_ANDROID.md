# Kai Printers Android — instalación para operadores

Guía de 1 página para instalar el agente de impresión en la **misma tablet** donde corre el POS (Chrome).

## 1. Descargar

1. Abrí el **POS KaiStore** en Chrome (HTTPS).
2. Menú **Configuración** → **Impresión local**.
3. En **Descargar Kai Printers**, tocá **Descargar vX.Y.Z** (Android).
4. Esperá a que termine la descarga del APK versionado (`kai-printers-android-X.Y.Z.apk`).

## 2. Instalar

1. Abrí la notificación de descarga o **Archivos** → **Descargas**.
2. Tocá el APK descargado.
3. Si Android lo pide, permití **instalar aplicaciones desconocidas** para **Chrome** (o para **Archivos**).
4. Confirmá **Instalar**.

> **Actualización:** si ya tenías Kai Printers, instalá encima sin desinstalar (mismo certificado de KaiStore).

## 3. Configurar Kai Printers (primera vez)

1. Abrí la app **Kai Printers**.
2. **Permisos:**
   - Notificaciones → permitir (Android 13+).
   - Bluetooth → permitir (en Android 7–11 también ubicación).
   - Optimización de batería → abrir ajustes y excluir Kai Printers si el fabricante lo permite.
   - **Iniciar servicio** → activar el interruptor (debe quedar la notificación «Kai Printers activo»).
3. **Impresoras:** pestaña **Bluetooth**, **Red** o **USB**; asigná **Tickets** y hacé **Imprimir prueba**.
4. **Servicio / WSS:** si el POS usa HTTPS, en Kai Printers tocá **Confiar certificado WSS** y aceptá en Chrome cuando abra `https://127.0.0.1:14568`.

## 4. Conectar el POS

En el POS → **Impresión local**:

| Campo | Valor típico (misma tablet) |
|-------|-----------------------------|
| Host | `127.0.0.1` |
| Usar WSS | Sí (si el POS es HTTPS) |
| Puerto WSS | `14568` |
| Impresora tickets | alias configurado en Kai Printers |

Guardá y verificá que el icono de impresión en la barra superior del POS quede **verde**.

## 5. Probar

1. Hacé una venta de prueba.
2. Imprimí el ticket.
3. Debe salir en la impresora **sin** diálogo de impresión del navegador.

## Problemas frecuentes

| Síntoma | Qué revisar |
|---------|-------------|
| No deja instalar el APK | Orígenes desconocidas para Chrome; espacio en disco |
| POS no conecta (rojo) | Servicio Kai Printers activo; host `127.0.0.1`; WSS y certificado confiado |
| Ticket no sale | Impresora encendida; transporte correcto (BT/red/USB); alias «Tickets» |
| «App no instalada» al actualizar | Desinstalá la versión antigua solo si cambió el certificado (soporte KaiStore) |

## Soporte técnico (Joyarte / KaiStore)

- APK: `/downloads/kai-printers-android-{versión}.apk` (manifest en `/downloads/kai-printers-android.manifest.json`).
- Puertos agente: WS `14567`, WSS `14568`.
